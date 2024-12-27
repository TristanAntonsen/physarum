@group(0) @binding(0) var<uniform> rez: vec2f;
@group(0) @binding(1) var<uniform> time: f32;
@group(0) @binding(2) var<storage, read_write> agentData: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> textureData: array<vec4<f32>>;


struct VertexInput {
    @location(0) pos: vec2f,
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) tex_coords: vec2<f32>,
};

const positions = array(
    vec2(-1., -1.),
    vec2(1., -1.),
    vec2(1., 1.),
    vec2(-1., -1.),
    vec2(1., 1.),
    vec2(-1., 1.),
    );

const uvCoords = array(
    vec2(0., 0.),
    vec2(1., 0.),
    vec2(1., 1.),
    vec2(0., 0.),
    vec2(1., 1.),
    vec2(0., 1.),
    );

@vertex
fn vertexMain(@builtin(vertex_index) VertexIndex: u32, input: VertexInput) ->
    VertexOutput {
    var output: VertexOutput;

    output.tex_coords = uvCoords[VertexIndex];
    output.pos = vec4f(positions[VertexIndex], 0, 1);

    return output;
}


@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
    // Flip the Y coordinate of the texture coordinates
    let flipped_tex_coords = vec2<f32>(in.tex_coords.x, 1.0 - in.tex_coords.y);
    let uv = flipped_tex_coords;
    let index = u32((uv.x * rez.x) + floor(uv.y * rez.y) * rez.x);

    // Sample the texture using the flipped coordinates
    var fragColor = textureData[index];



    // Divide accumulated value by current sample count
    // return vec4f(uv, 0., 1.);
    return fragColor;
}


// @fragment
// fn fragmentMain(@builtin(position) pos: vec4<f32>) -> @location(0) vec4f {

//     // var uv = (vec2f(pos.x, rez.y - pos.y) - 0.5*rez.xy)/min(rez.x, rez.y);
//     var uv = vec2f(pos.x, rez.y - pos.y) / rez.xy;
    
//     let index = u32((uv.x * rez.x) + floor(uv.y * rez.y) * rez.x);

//     var fragColor = textureData[index];

//     // return fragColor;
//     return vec4f(f32(index % 128) / 255.0, f32(index / 128 % 128) / 255.0, 0.0, 1.0);

// }
