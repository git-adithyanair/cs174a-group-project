import {defs, tiny} from './examples/common.js';
import {Shape_From_File} from './examples/obj-file-demo.js';
import {Body} from './examples/collisions-demo.js';
import {Text_Line} from './examples/text-demo.js'

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Movement_Controls, Texture
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export class Group_Project extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        //constant for Grid_Patch
        const row_operation_2 = (s, p) => vec3(-1, 5 * s - 1, Math.random()+Math.random());
        const column_operation_2 = (t, p, s) => vec3(1200 * t - 1, 20 * s - 1, Math.random()+Math.random());

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            jet_body: new defs.Capped_Cylinder(20, 20),
            wing: new defs.Triangle(),
            cockpit: new defs.Closed_Cone(20, 20),
            cube: new defs.Cube(),
            water: new defs.Cube(),
            jet: new Shape_From_File("assets/jet.obj"),
            missile: new Shape_From_File("assets/missile.obj"),
            canyonWall: new defs.Grid_Patch(30, 1400, row_operation_2, column_operation_2),
            uranium: new Shape_From_File("assets/uranium.obj"),
            display: new defs.Square(),
            text: new Text_Line(50)
        };

        // *** Materials
        this.materials = {
            jet: new Material(new defs.Phong_Shader(), 
                                      {
                                          ambient: .5, diffusivity: .5, specularity: .5,
                                          color: hex_color('#746e6b'),
                                      }
                                  ),
            missile: new Material(new defs.Textured_Phong(), 
                                      {
                                          ambient: 0,
                                          color: hex_color('#000000'),
                                          texture: new Texture("assets/missile.jpg")
                                      }
                                 ),
            canyon: new Material(new defs.Textured_Phong(),
                                  {
                                      ambient: 1,
                                      specularity: 0.4,
                                      color: hex_color('#000000'),
                                      texture: new Texture("assets/canyon.png", "LINEAR_MIPMAP_LINEAR")
                                  }),
            uranium: new Material(new defs.Phong_Shader(),
                                      {ambient: 0.4, diffusivity: 0.6, color: hex_color('#e8dd13')}),
            water: new Material(new Texture_Scroll_X(),
                                  {
                                        color: hex_color("#000000"),
                                        ambient: 1,
                                        specularity: 0,
                                        texture: new Texture("assets/sea-water.png", "LINEAR_MIPMAP_LINEAR")
                                  }),
            display: new Material(new defs.Phong_Shader(),
                                  {
                                      ambient: 0.6,
                                      diffusivity: .3,
                                      specularity: .5,
                                      smoothness: 10,
                                      color: hex_color('#98fb98'), 
                                  }),
            text: new Material(new defs.Textured_Phong(),
                               {
                                   ambient: 1,
                                   diffusivity: 0,
                                   specularity: 0,
                                   texture: new Texture("assets/text.png")
                               })
            
        }

        this.set_game();
        
        this.initial_camera_location = Mat4.look_at(vec3(0, 12, -35), vec3(0, 0, 0), vec3(0, 1, 0));

        this.base_jet_transformation = Mat4.scale(4, 4, 4)
                                           .times(Mat4.rotation(-Math.PI/2, 1, 0, 0))
                                           .times(Mat4.rotation(-Math.PI/2, 0, 0, 1));

        this.base_missile_transformation = Mat4.rotation(-Math.PI/2, 0, 1, 0)
                                               .times(Mat4.scale(2, 2, 2));
        
        this.water_transformation = Mat4.identity().times(Mat4.scale(this.canyon_width + 1, 1, this.canyon_dist))
                                                   .times(Mat4.translation(0, this.water_start, 0))
                                                   .times(Mat4.rotation(Math.PI/2, 0, 0, 1));

    }

    set_game() {
        
        this.jet_speed = 30;
        this.pos = Mat4.identity();

        this.wing_tip = 8.5;

        this.m_pos = Mat4.identity().times(Mat4.translation(0, 0, -1000));
        this.missile_speed = 80;
        this.next_missile_time = 2;
        this.next_missile_probability = 0.25;
        this.missile_render_dist = 150;
        this.missile_shown = false;
        this.has_collided = false;
        this.jet_hit = false;
        this.jet_hit_time = 0;
        this.jet_hit_time_delay = 0.5;

        this.canyon_width = 20;
        this.canyon_dist = 1200;
        this.canyon_dsiplacement = 15;
        this.left_canyon_collision = false;
        this.right_canyon_collision = false;

        this.water_start = -15; 

        this.max_canyon_height = 35;
        this.hit_max_height = false;

        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;

        this.num_lives = 50;

        this.game_won = false;
        this.game_lost = false;
        
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.control_panel.innerHTML += "Welcome to your mission! You have been tasked with destroying an unsactioned uranium plant which is located at the far end of this canyon. It is defended by tracking missiles! GET to the end, DESTROY the plant and SAVE the world!";
        this.new_line();
        this.new_line();
        this.live_string(box => box.textContent = this.num_lives ? "Plane health: " + "|".repeat(this.num_lives) : "Plane health: ");
        this.new_line();
        this.new_line();
        this.live_string(box => box.textContent = "Distance travelled: " + this.pos[2][3].toFixed(0) + "m");
        this.new_line();
        this.new_line();
        this.key_triggered_button("Up", ["w"], 
                                  () => {
                                      this.up = true;
                                  },
                                  undefined,
                                  () => {
                                      this.up = false;
                                  },
                                 );
        this.new_line();
        this.key_triggered_button("Left", ["a"], 
                                  () => { 
                                      this.left = true;
                                  },
                                  undefined,
                                  () => { 
                                      this.left = false;
                                  }
        );
        this.key_triggered_button("Right", ["d"],
                                  () => { 
                                      this.right = true;
                                  },
                                  undefined,
                                  () => { 
                                      this.right = false;
                                  }
        );
        this.new_line();
        this.key_triggered_button("Down", ["s"],
                                  () => { 
                                      this.down = true;
                                  },
                                  undefined,
                                  () => { 
                                      this.down = false;
                                  }
        );
        this.new_line();
        this.key_triggered_button("Restart", [" "],
                                  () => { 
                                      if (this.game_won || this.game_lost) {
                                          this.set_game();
                                      }
                                  }
        );
    }

    distance_from_missile_to_jet() {
        
        const pos_x = this.pos[0][3];
        const pos_y = this.pos[1][3];
        const pos_z = this.pos[2][3];

        const m_pos_x = this.m_pos[0][3];
        const m_pos_y = this.m_pos[1][3];
        const m_pos_z = this.m_pos[2][3];

        return Math.sqrt(Math.pow(pos_x - m_pos_x, 2) + Math.pow(pos_y - m_pos_y, 2) + Math.pow(pos_z - m_pos_z, 2));
        
    }

    calculate_missile_angle_x() {
        const distance_to_jet = this.distance_from_missile_to_jet();
        const x_displacement = this.m_pos[0][3] - this.pos[0][3];
        return Math.asin(x_displacement/distance_to_jet);
    }

    calculate_missile_angle_y() {
        const distance_to_jet = this.distance_from_missile_to_jet();
        const y_displacement = this.m_pos[1][3] - this.pos[1][3];
        return Math.acos(y_displacement/distance_to_jet);
    }

    move_scene() {
        const new_jet_pos = this.pos.times(Mat4.translation(0, 0, this.jet_speed));
        this.pos = new_jet_pos.map((x, i) => Vector.from(this.pos[i]).mix(x, 0.01));
        if (this.missile_shown) {
            const new_missile_pos = this.m_pos.times(Mat4.translation(0, 0, -this.missile_speed))
                                              .times(Mat4.rotation(this.calculate_missile_angle_x(), 0, 1, 0))
                                              .times(Mat4.rotation(this.calculate_missile_angle_y() - Math.PI/2, 1, 0, 0));
            this.m_pos = new_missile_pos.map((x, i) => Vector.from(this.m_pos[i]).mix(x, 0.01));
        }
    }

    check_if_colliding() {
        const points = new defs.Cube();
        const leeway = 4;
        const T = Mat4.inverse(this.pos).times(this.m_pos);
        return points.arrays.position.some(p => Body.intersect_cube(T.times(p.to4(1)).to3(), leeway));
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!this.setup_complete) {
            // this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);

            this.setup_complete = true;
        }

        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, .1, 1000);

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        // The parameters of the Light are: position, color, size
        program_state.lights = [
            new Light(vec4(this.pos[0][3], this.pos[1][3] + 10, this.pos[2][3] + 50, 1), color(1, 1, 1, 1), 100000),
            new Light(vec4(0, 10, this.canyon_dist * (1/6), 1), color(1, 1, 1, 1), 1000),
            new Light(vec4(0, 10, this.canyon_dist * (2/6), 1), color(1, 1, 1, 1), 1000),
            new Light(vec4(0, 10, this.canyon_dist * (3/6), 1), color(1, 1, 1, 1), 1000),
            new Light(vec4(0, 10, this.canyon_dist * (4/6), 1), color(1, 1, 1, 1), 1000),
            new Light(vec4(0, 10, this.canyon_dist * (5/6), 1), color(1, 1, 1, 1), 1000),
            new Light(vec4(0, 10, this.canyon_dist * (6/6), 1), color(1, 1, 1, 1), 1000),                               
        ];

        if (this.game_won || this.game_lost) {

            const display_transformation = Mat4.identity().times(this.pos).times(Mat4.scale(10, 8, 1))
                                                          .times(Mat4.translation(0, 0.5, -10))
                                                          .times(Mat4.rotation(Math.PI/4, 1, 0, 0));
            
            let display_color;
            
            if (this.game_won) {
                display_color = hex_color("#98fb98");
            } else if (this.game_lost) {
                display_color = hex_color("#800000");
            }

            this.shapes.display.draw(context, program_state, display_transformation, this.materials.display.override({color: display_color}));
            
            if (this.game_won) {
                
                const text_1_transformation = Mat4.identity().times(this.pos)
                                                             .times(Mat4.translation(6, 8, -11))
                                                             .times(Mat4.rotation(Math.PI, 0, 1, 0));
            
                const text_2_transformation = Mat4.identity().times(this.pos)
                                                             .times(Mat4.translation(8, 5.5, -11))
                                                             .times(Mat4.rotation(Math.PI, 0, 1, 0))
                                                             .times(Mat4.scale(0.3, 0.3, 0.3));
    
                const text_3_transformation = Mat4.identity().times(this.pos)
                                                             .times(Mat4.translation(5.75, 3, -11))
                                                             .times(Mat4.rotation(Math.PI, 0, 1, 0))
                                                             .times(Mat4.scale(0.3, 0.3, 0.3));
                
                this.shapes.text.set_string("Game won!", context.context);
                this.shapes.text.draw(context, program_state, text_1_transformation, this.materials.text);
                this.shapes.text.set_string("You've destroyed the uranium deposit!", context.context);
                this.shapes.text.draw(context, program_state, text_2_transformation, this.materials.text);
                this.shapes.text.set_string("Press spacebar to restart...", context.context);
                this.shapes.text.draw(context, program_state, text_3_transformation, this.materials.text);
                
            } else if (this.game_lost) {
                
                const text_1_transformation = Mat4.identity().times(this.pos)
                                                             .times(Mat4.translation(6.5, 8, -11))
                                                             .times(Mat4.rotation(Math.PI, 0, 1, 0));
            
                const text_2_transformation = Mat4.identity().times(this.pos)
                                                             .times(Mat4.translation(6.5, 5.5, -11))
                                                             .times(Mat4.rotation(Math.PI, 0, 1, 0))
                                                             .times(Mat4.scale(0.3, 0.3, 0.3));
    
                const text_3_transformation = Mat4.identity().times(this.pos)
                                                             .times(Mat4.translation(5.75, 3, -11))
                                                             .times(Mat4.rotation(Math.PI, 0, 1, 0))
                                                             .times(Mat4.scale(0.3, 0.3, 0.3));
                
                this.shapes.text.set_string("Game lost!", context.context);
                this.shapes.text.draw(context, program_state, text_1_transformation, this.materials.text);
                this.shapes.text.set_string("Your plane has been destroyed!", context.context);
                this.shapes.text.draw(context, program_state, text_2_transformation, this.materials.text);
                this.shapes.text.set_string("Press spacebar to restart...", context.context);
                this.shapes.text.draw(context, program_state, text_3_transformation, this.materials.text);
                
            }

            program_state.set_camera(this.initial_camera_location.times(Mat4.inverse(this.pos)));
            
        } else {

            this.move_scene();

            if (this.up && !this.hit_max_height) {
                this.pos = this.pos.times(Mat4.translation(0, this.jet_speed * dt, 0));
            }
    
            if (this.down) {
                this.pos = this.pos.times(Mat4.translation(0, -this.jet_speed * dt, 0));
            }
    
            if (this.left && !this.left_canyon_collision) {
                this.pos = this.pos.times(Mat4.translation(this.jet_speed * dt, 0, 0));
            }
    
            if (this.right && !this.right_canyon_collision) {
                this.pos = this.pos.times(Mat4.translation(-this.jet_speed * dt, 0, 0));
            }
    
            if (t > this.next_missile_time && Math.random() < this.next_missile_probability && !this.missile_shown) {
                this.next_missile_time += 2;
                const missile_x = Math.floor(Math.random() * 100) * (10 / 100) * (Math.random() > 0.5 ? 1 : -1);
                const missile_y = Math.floor(Math.random() * 100) * (10 / 100) * (Math.random() > 0.5 ? 1 : -1);
                this.m_pos = Mat4.identity().times(Mat4.translation(missile_x, missile_y, this.pos[2][3] + this.missile_render_dist)); 
                const missile_transformation = Mat4.identity().times(this.m_pos).times(this.base_missile_transformation);
                this.shapes.missile.draw(context, program_state, missile_transformation, this.materials.missile);
                this.missile_shown = true;
            }
    
            if (this.missile_shown) {
                const missile_transformation = Mat4.identity().times(this.m_pos).times(this.base_missile_transformation);
                this.shapes.missile.draw(context, program_state, missile_transformation, this.materials.missile);
            }
    
            this.has_collided = this.check_if_colliding();
    
            if (this.m_pos[2][3] < this.pos[2][3] - 20 && !this.has_collided) {
                this.missile_shown = false;
            }
    
            if ((this.pos[0][3] - this.wing_tip + 2) <= -this.canyon_width) {
                this.right_canyon_collision = true;
                this.jet_hit = true;
                this.jet_hit_time = t;
                this.num_lives -= 0.25;
            } else if ((this.wing_tip + this.pos[0][3] - 2) >= this.canyon_width) {
                this.left_canyon_collision = true;
                this.jet_hit = true;
                this.jet_hit_time = t;
                this.num_lives -= 0.25;
            } else {
                this.left_canyon_collision = false;
                this.right_canyon_collision = false;
            }
    
            if (this.has_collided) {
                this.missile_shown = false;
                this.jet_hit = true;
                this.jet_hit_time = t;
                this.m_pos =  Mat4.identity().times(Mat4.translation(0, 0, -1000));
                this.num_lives -= 10;
            }

            if (this.pos[1][3] - 1 <= this.water_start) {
                this.num_lives = 0
            }

            if (this.pos[1][3] >= this.max_canyon_height) {
                this.hit_max_height = true;
            }
            else {
                this.hit_max_height = false;
            }

            if (this.pos[2][3] >= this.canyon_dist - 50) {
                this.game_won = true;
            }
            
            if (this.num_lives <= 0) {
                this.game_lost = true;
            }
    
            const jet_transformation = Mat4.identity().times(this.pos).times(this.base_jet_transformation);
            let jet_color = hex_color("#746e6b");
    
            if (this.jet_hit && t < this.jet_hit_time + this.jet_hit_time_delay) {
                jet_color = hex_color("#d22b2b");
            }
    
            this.shapes.jet.draw(context, program_state, jet_transformation, this.materials.jet.override({color: jet_color}));
    
            program_state.set_camera(this.initial_camera_location.times(Mat4.inverse(this.pos)));

            const left_canyon_transformation = Mat4.identity().times(Mat4.scale(1, 10, 1))
                                                              .times(Mat4.translation(this.canyon_width, -10, this.canyon_dist - 15))
                                                              .times(Mat4.rotation(Math.PI/2,0, 1, 0));
            
            const right_canyon_transformation = Mat4.identity().times(Mat4.scale(1, 10, 1))
                                                               .times(Mat4.translation(-this.canyon_width, -10, -15))
                                                               .times(Mat4.rotation(-Math.PI/2,0, 1, 0));

            const end_canyon_transformation = Mat4.identity().times(Mat4.scale(1, 10, 1))
                                                             .times(Mat4.translation(-this.canyon_width, -10, this.canyon_dist - 20));
            
            const uranium = Mat4.identity().times(Mat4.scale(2, 2, 2))
                                        .times(Mat4.translation(0, 0, 580))
                                       .times(Mat4.rotation(Math.PI/2, 0, 1, 0));
                                       
            
            this.water_transformation = this.water_transformation.times(Mat4.rotation(Math.PI*dt/50, 0, 1, 0));
        
            this.shapes.water.draw(context, program_state, this.water_transformation, this.materials.water);
            this.shapes.canyonWall.draw(context, program_state, left_canyon_transformation, this.materials.canyon);
            this.shapes.canyonWall.draw(context, program_state, right_canyon_transformation, this.materials.canyon);
            this.shapes.canyonWall.draw(context, program_state, end_canyon_transformation, this.materials.canyon);
            this.shapes.uranium.draw(context, program_state, uranium, this.materials.uranium);

        }
        
    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;
        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );
                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
          center = model_transform * vec4(0.0, 0.0, 0.0, 1.0);
          point_position = model_transform * vec4(position, 1.0);
          gl_Position = projection_camera_model_transform * vec4(position, 1.0);
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
          gl_FragColor = sin(30.0 * distance(point_position.xyz, center.xyz)) * vec4(0.69, 0.50, 0.25, 1.0);
        }`;
    }
}

class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                float modAnimation = mod(animation_time, 4.0);
                float transformation = 2.0 * modAnimation ;
                vec4 transformBy = vec4(f_tex_coord.x, f_tex_coord.y, 0.0, 1.0);
                mat4 trans = mat4(vec4(1.0, 0.0, 0.0, 0.0),
                                        vec4(0.0, 1.0, 0.0, 0.0),
                                        vec4(0.0, 0.0, 1.0, 0.0),
                                        vec4(-transformation, 0.0, 0.0, 1.0)
                                );
                vec4 coordinate = trans * transformBy;
                float xCoord = mod(coordinate.x, 1.0);
                float yCoord = mod(coordinate.y, 1.0);
                vec4 tex_color = texture2D( texture, coordinate.xy);
                vec4 new_tex_color = vec4(0.0, 0.0, 0.0, 1.0);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w );
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}