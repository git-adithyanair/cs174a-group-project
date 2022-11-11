import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Movement_Controls
} = tiny;

export class GroupProject extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            jet_body: new defs.Capped_Cylinder(20, 20),
            wing: new defs.Triangle(),
            cockpit: new defs.Closed_Cone(20, 20),
            cube: new defs.Cube()
        };

        // *** Materials
        this.materials = {
            jet: new Material(new defs.Phong_Shader(), 
                                  {ambient: 0.4, diffusivity: 0.6, color: hex_color('#a6a5a4')}),
            canyon: new Material(new defs.Phong_Shader(), 
                                  {ambient: 0.4, diffusivity: 0.6, color: hex_color('#9a7b4f')}),
        }
        
        this.initial_camera_location = Mat4.look_at(vec3(0, 20, -35), vec3(0, 0, 0), vec3(0, 1, 0));

        this.base_jet_body_transformation = Mat4.scale(1, 1, 6.5);
        this.base_left_wing_transformation = Mat4.rotation(Math.PI/2, 1, 0, 0)
                                                 .times(Mat4.translation(1, 0, 0))
                                                 .times(Mat4.scale(4, 2, 2));
        this.base_right_wing_transformation = Mat4.rotation(Math.PI/2, 0, 0, 1)
                                                  .times(Mat4.rotation(-Math.PI/2, 0, 1, 0))
                                                  .times(Mat4.translation(0, 1, 0))
                                                  .times(Mat4.scale(2, 4, 2));
        this.base_rudder_transformation = Mat4.rotation(-Math.PI/2, 0, 1, 0)
                                              .times(Mat4.translation(-3.25, 0.75, 0))
                                              .times(Mat4.scale(2, 2.5, 2));
        this.base_cockpit_transformation = Mat4.translation(0, 0, 4.25);


        this.airplane_speed = 5;
        this.movement_speed = 10;
        this.pos = Mat4.identity();

        this.left_tilt = false;

        this.setup_complete = false;

    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Up", ["w"], () => {
            const new_pos = this.pos.times(Mat4.translation(0, this.movement_speed, 0));
            this.pos = new_pos.map((x, i) => Vector.from(this.pos[i]).mix(x, 0.1));
        });
        this.new_line();
        this.key_triggered_button("Left", ["a"], 
                                    () => {
                                        const new_pos = this.pos.times(Mat4.translation(this.movement_speed, 0, 0));
                                        this.pos = new_pos.map((x, i) => Vector.from(this.pos[i]).mix(x, 0.1));
                                        // if (!this.left_tilt) {
                                        //     this.left_tilt = true;
                                        //     this.pos = this.pos.times(Mat4.rotation(-Math.PI/4, 0, 0, 1));
                                        // }
                                    }, 
                                    // undefined, 
                                    // () => {
                                    //     this.left_tilt = false;
                                    //     this.pos = this.pos.times(Mat4.rotation(Math.PI/4, 0, 0, 1));
                                    // }
        );
        this.key_triggered_button("Right", ["d"], () => {
            const new_pos = this.pos.times(Mat4.translation(-this.movement_speed, 0, 0));
            this.pos = new_pos.map((x, i) => Vector.from(this.pos[i]).mix(x, 0.1));
        });
        this.new_line();
        this.key_triggered_button("Down", ["s"], () => {
            const new_pos = this.pos.times(Mat4.translation(0, -this.movement_speed, 0));
            this.pos = new_pos.map((x, i) => Vector.from(this.pos[i]).mix(x, 0.1));
        });
    }

    move_plane_forward() {
        const new_pos = this.pos.times(Mat4.translation(0, 0, this.airplane_speed));
        this.pos = new_pos.map((x, i) => Vector.from(this.pos[i]).mix(x, 0.01));
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

        this.move_plane_forward();

        const jet_body_transformation = Mat4.identity().times(this.pos).times(this.base_jet_body_transformation);
        const left_wing_transformation = Mat4.identity().times(this.pos).times(this.base_left_wing_transformation)
        const right_wing_transformation = Mat4.identity().times(this.pos).times(this.base_right_wing_transformation)
        const rudder_transformation = Mat4.identity().times(this.pos).times(this.base_rudder_transformation)
        const cockpit_transformation = Mat4.identity().times(this.pos).times(this.base_cockpit_transformation);

        // program_state.set_camera(this.initial_camera_location.times(Mat4.inverse(this.pos)));
        
        this.shapes.jet_body.draw(context, program_state, jet_body_transformation, this.materials.jet);
        this.shapes.wing.draw(context, program_state, left_wing_transformation, this.materials.jet);
        this.shapes.wing.draw(context, program_state, right_wing_transformation, this.materials.jet);
        this.shapes.wing.draw(context, program_state, rudder_transformation, this.materials.jet);
        this.shapes.cockpit.draw(context, program_state, cockpit_transformation, this.materials.jet);

        const left_canyon_transformation = Mat4.identity().times(Mat4.translation(20, 0, 0))
                                                     .times(Mat4.scale(1, 10, 1000));
        const right_canyon_transformation = Mat4.identity().times(Mat4.translation(-20, 0, 0))
                                                     .times(Mat4.scale(1, 10, 1000));

        this.shapes.cube.draw(context, program_state, left_canyon_transformation, this.materials.canyon);
        this.shapes.cube.draw(context, program_state, right_canyon_transformation, this.materials.canyon);

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

