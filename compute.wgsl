@group(0) @binding(0) var<uniform> rez: vec2f;
@group(0) @binding(1) var<uniform> time: f32;
@group(0) @binding(2) var<storage, read_write> agentData: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> textureData: array<vec4<f32>>;


@compute
@workgroup_size(1)
fn initialize(@builtin(global_invocation_id) id: vec3<u32>) {
    // let index = rx + ry * res;
    textureData[2000] = vec4f(1.);
    textureData[2100] = vec4f(1.);
    textureData[3500] = vec4f(1.);
}

@compute
@workgroup_size(1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {

    // to do
}
