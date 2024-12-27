
export function dot(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1]
}

export function add(v1, v2, out = v1) {
// Modifies v1 in place
    out[0] = v1[0] + v2[0];
    out[1] = v1[1] + v2[1];
    return out;
}

export function subtract(v1, v2, out = v1) {
// Modifies v1 in place
    out[0] = v1[0] - v2[0];
    out[1] = v1[1] - v2[1];
    return out;
}

export function divide(v1, a, out = v1) {
// Modifies v1 in place
    out[0] = v1[0] / a;
    out[1] = v1[1] / a;
    return out;
}

export function scale(v1, a, out = v1) {
// Modifies v1 in place
    out[0] = v1[0] * a;
    out[1] = v1[1] * a;
    return out;
}

export function norm(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
}

export function normalize(v, out = v) {
    divide(out, norm(v))
}

