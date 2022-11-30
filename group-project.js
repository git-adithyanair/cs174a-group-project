import {defs, tiny} from './examples/common.js';
import {Shape_From_File} from './examples/obj-file-demo.js';
import {Body} from './examples/collisions-demo.js'

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Movement_Controls, Texture
} = tiny;

export class Maverick extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            jet_body: new defs.Capped_Cylinder(20, 20),
            wing: new defs.Triangle(),
            cockpit: new defs.Closed_Cone(20, 20),
            cube: new defs.Cube(),
            jet: new Shape_From_File("assets/jet.obj"),
            missile: new Shape_From_File("assets/missile.obj")
        };

        this.bodies = [
            new Body(this.shapes.jet, undefined, vec3(1, 1, 1)),
            new Body(this.shapes.cube, undefined, vec3(1, 1, 1))
        ]

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
                                          ambient: .5, diffusivity: .5, specularity: .5,
                                          color: hex_color('#830001'),
                                          texture: new Texture("assets/missile.jpg")
                                      }
                                  ),
            canyon: new Material(new defs.Phong_Shader(), 
                                  {
                                      ambient: 1, 
                                      diffusivity: 1, 
                                      color: hex_color('#9a7b4f'), 
                                      texture: new Texture("assets/canyon.jpeg", "LINEAR_MIPMAP_LINEAR")
                                  }), 
        }
        
        this.initial_camera_location = Mat4.look_at(vec3(0, 12, -35), vec3(0, 0, 0), vec3(0, 1, 0));

        // this.base_jet_body_transformation = Mat4.scale(1, 1, 6.5);
        // this.base_left_wing_transformation = Mat4.rotation(Math.PI/2, 1, 0, 0)
        //                                          .times(Mat4.translation(1, 0, 0))
        //                                          .times(Mat4.scale(4, 2, 2));
        // this.base_right_wing_transformation = Mat4.rotation(Math.PI/2, 0, 0, 1)
        //                                           .times(Mat4.rotation(-Math.PI/2, 0, 1, 0))
        //                                           .times(Mat4.translation(0, 1, 0))
        //                                           .times(Mat4.scale(2, 4, 2));
        // this.base_rudder_transformation = Mat4.rotation(-Math.PI/2, 0, 1, 0)
        //                                       .times(Mat4.translation(-3.25, 0.75, 0))
        //                                       .times(Mat4.scale(2, 2.5, 2));
        // this.base_cockpit_transformation = Mat4.translation(0, 0, 4.25);

        this.base_jet_transformation = Mat4.scale(4, 4, 4)
                                           .times(Mat4.rotation(-Math.PI/2, 1, 0, 0))
                                           .times(Mat4.rotation(-Math.PI/2, 0, 0, 1));

        this.base_missile_transformation = Mat4.rotation(-Math.PI/2, 0, 1, 0)
                                               .times(Mat4.scale(2, 2, 2));

        this.jet_speed = 20;
        this.pos = Mat4.identity();

        this.m_pos = Mat4.identity();
        this.missile_speed = 80;
        this.next_missile_time = 2;
        this.next_missile_probability = 0.25;
        this.missile_shown = false;

        this.canyon_width = 30;

        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;

    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
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
    }

    move_scene() {
        const new_jet_pos = this.pos.times(Mat4.translation(0, 0, this.jet_speed));
        this.pos = new_jet_pos.map((x, i) => Vector.from(this.pos[i]).mix(x, 0.01));
        if (this.missile_shown) {
            const new_missile_pos = this.m_pos.times(Mat4.translation(0, 0, -this.missile_speed));
            this.m_pos = new_missile_pos.map((x, i) => Vector.from(this.m_pos[i]).mix(x, 0.01));
        }
    }

    update_state() {
        // update_state():  Override the base time-stepping code to say what this particular
        // scene should do to its bodies every frame -- including applying forces.
        // Generate moving bodies:

        const collider = {intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(1), leeway: .5};
        // Loop through all bodies (call each "a"):
        for (let a of this.bodies) {
            // Cache the inverse of matrix of body "a" to save time.
            a.inverse = Mat4.inverse(a.drawn_location);

            // *** Collision process is here ***
            // Loop through all bodies again (call each "b"):
            for (let b of this.bodies) {
                // Pass the two bodies and the collision shape to check_if_colliding():
                if (!a.check_if_colliding(b, collider))
                    continue;
                // If we get here, we collided, so turn red and zero out the
                // velocity so they don't inter-penetrate any further.
                console.log("TOUCH");
            }
        }
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!this.setup_complete) {
            // this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
            
            // The parameters of the Light are: position, color, size
            program_state.lights = [new Light(vec4(0, 5, 5, 1), color(1, 1, 1, 1), 100000)];

            this.setup_complete = true;
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        this.move_scene();

        if (this.up) {
            this.pos = this.pos.times(Mat4.translation(0, this.jet_speed * dt, 0));
        }

        if (this.down) {
            this.pos = this.pos.times(Mat4.translation(0, -this.jet_speed * dt, 0));
        }

        if (this.left) {
            this.pos = this.pos.times(Mat4.translation(this.jet_speed * dt, 0, 0));
        }

        if (this.right) {
            this.pos = this.pos.times(Mat4.translation(-this.jet_speed * dt, 0, 0));
        }

        // const jet_body_transformation = Mat4.identity().times(this.pos).times(this.base_jet_body_transformation);
        // const left_wing_transformation = Mat4.identity().times(this.pos).times(this.base_left_wing_transformation)
        // const right_wing_transformation = Mat4.identity().times(this.pos).times(this.base_right_wing_transformation)
        // const rudder_transformation = Mat4.identity().times(this.pos).times(this.base_rudder_transformation)
        // const cockpit_transformation = Mat4.identity().times(this.pos).times(this.base_cockpit_transformation);

        // this.shapes.jet_body.draw(context, program_state, jet_body_transformation, this.materials.jet);
        // this.shapes.wing.draw(context, program_state, left_wing_transformation, this.materials.jet);
        // this.shapes.wing.draw(context, program_state, right_wing_transformation, this.materials.jet);
        // this.shapes.wing.draw(context, program_state, rudder_transformation, this.materials.jet);
        // this.shapes.cockpit.draw(context, program_state, cockpit_transformation, this.materials.jet);

        if (t > this.next_missile_time && Math.random() < this.next_missile_probability && !this.missile_shown) {
            this.next_missile_time += 2;
            const missile_x = Math.floor(Math.random() * 100) * (this.canyon_width / 100) * (Math.random() > 0.5 ? 1 : -1);
            const missile_y = Math.floor(Math.random() * 100) * (this.canyon_width / 100) * (Math.random() > 0.5 ? 1 : -1);
            this.m_pos = this.m_pos.times(Mat4.translation(missile_x, missile_y, 120));
            const missile_transformation = Mat4.identity().times(this.m_pos).times(this.base_missile_transformation);
            this.shapes.missile.draw(context, program_state, missile_transformation, this.materials.missile);
            this.missile_shown = true;
        }

        if (this.missile_shown) {
            const missile_transformation = Mat4.identity().times(this.m_pos).times(this.base_missile_transformation);
            this.shapes.missile.draw(context, program_state, missile_transformation, this.materials.missile);
        }

        console.log(this.m_pos[2][3], this.pos[2][3]);
        
        if (this.m_pos[2][3] < this.pos[2][3]) {
            this.missile_shown = false;
        }

        const jet_transformation = Mat4.identity().times(this.pos).times(this.base_jet_transformation);

        this.shapes.jet.draw(context, program_state, jet_transformation, this.materials.jet);

        program_state.set_camera(this.initial_camera_location.times(Mat4.inverse(this.pos)));

        const left_canyon_transformation = Mat4.identity().times(Mat4.translation(this.canyon_width, 0, 0))
                                                     .times(Mat4.scale(1, 15, 1000));
        const right_canyon_transformation = Mat4.identity().times(Mat4.translation(-this.canyon_width, 0, 0))
                                                     .times(Mat4.scale(1, 15, 1000));

        this.shapes.cube.draw(context, program_state, left_canyon_transformation, this.materials.canyon);
        this.shapes.cube.draw(context, program_state, right_canyon_transformation, this.materials.canyon);

        // this.update_state();

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

