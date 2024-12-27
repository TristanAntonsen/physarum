export const meshVertexSize = 4 * 4; // Byte size of one cube vertex.
export const meshPositionOffset = 0;

// Creating the quad for rendering the texture
const HALF_WIDTH = 1.0;
export const quadVertices = new Float32Array([
    //   X,    Y,
    -HALF_WIDTH, -HALF_WIDTH, // Triangle 1 (Blue)
    HALF_WIDTH, -HALF_WIDTH,
    HALF_WIDTH, HALF_WIDTH,

    -HALF_WIDTH, -HALF_WIDTH, // Triangle 2 (Red)
    HALF_WIDTH, HALF_WIDTH,
    -HALF_WIDTH, HALF_WIDTH,
]);