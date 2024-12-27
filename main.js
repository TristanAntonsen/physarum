
import {
    quadVertices,
} from '/meshes.js';

import * as LINALG from '/linalg.js'

async function initializeGPU(canvas) {
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }

    // WebGPU's representation of the available gpu hardware
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
    }

    // The main interface through which most interaction with the GPU happens
    const device = await adapter.requestDevice();
    // Configuring the canvas
    const context = canvas.getContext("webgpu");
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: device,
        format: canvasFormat,
    });

    return { device, context, canvasFormat };
}

function createBuffer(device, data, usage) {
    const buffer = device.createBuffer({
        size: data.byteLength,
        usage: usage,
        mappedAtCreation: true,
    });
    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
}

async function main() {

    // Getting the canvas & setting the resolution
    let canvas = document.querySelector("canvas");

    const dpr = window.devicePixelRatio || 1;

    const X_RES = 128 * dpr;
    const Y_RES = 128 * dpr;

    canvas.width = X_RES;
    canvas.height = Y_RES;

    // Set the CSS width and height to the desired size
    canvas.style.width = `${X_RES / dpr}px`;
    canvas.style.height = `${Y_RES / dpr}px`;

    // Setting up the GPU Pipeline
    // Checking to make sure browser supports WebGPU
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }

    // WebGPU's representation of the available gpu hardware
    const adapter = await navigator.gpu.requestAdapter(); // returns a promise, so use await
    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
    }

    //Initialize GPU
    const { device, context, canvasFormat } = await initializeGPU(canvas);

    ////////// COMPUTE //////////
    const computeWGSL = await (await fetch('./compute.wgsl')).text();

    const textureWidth = 128;
    const textureHeight = textureWidth;

    const computeBindGroupLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        ],
    });

    const computePipeline = device.createComputePipeline({
        label: 'doubling compute pipeline',
        layout: device.createPipelineLayout({ bindGroupLayouts: [computeBindGroupLayout] }),
        compute: {
            module: device.createShaderModule({
                label: "Compute module",
                code: computeWGSL,
            }),
            entryPoint: "main"
        },
    });

    const resetPipeline = device.createComputePipeline({
        label: 'doubling compute pipeline',
        layout: device.createPipelineLayout({ bindGroupLayouts: [computeBindGroupLayout] }),
        compute: {
            module: device.createShaderModule({
                label: "Compute module",
                code: computeWGSL,
            }),
            entryPoint: "initialize"
        },
    });

    const numAgents = 100;
    const sizeVec2 = 8;
    const sizeVec4 = 16
    const agentBuffer = device.createBuffer({
        size: sizeVec2 * numAgents,
        usage: GPUBufferUsage.STORAGE,
      });

    const textureBuffer = device.createBuffer({
    size: textureWidth ** 2 * sizeVec4,
    usage: GPUBufferUsage.STORAGE,
    });
    
    // Create a uniform buffer that describes the grid.
    const rezUniformArray = new Float32Array([textureWidth, textureHeight]);
    const rezBuffer = createBuffer(device, rezUniformArray, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

    // Create a uniform buffer that tracks the time.
    const timeUniformArray = new Float32Array([0.0]);
    const timeBuffer = createBuffer(device, timeUniformArray, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

    // Setup a bindGroup to tell the shader which
    // buffer to use for the computation
    const computeBindGroup = device.createBindGroup({
        label: 'bindGroup for work buffer',
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: rezBuffer } },
            { binding: 1, resource: { buffer: timeBuffer } },
            { binding: 2, resource: { buffer: agentBuffer } },
            { binding: 3, resource: { buffer: textureBuffer } },
        ],
    });

    const workGroupCount = 128 * 128;

    const resetCompute = () => {
        // Encode commands to do the computation
        const computeEncoder = device.createCommandEncoder({
            label: 'doubling encoder',
        });
        const computePass = computeEncoder.beginComputePass({
            label: 'doubling compute pass',
        });

        computePass.setPipeline(resetPipeline);
        computePass.setBindGroup(0, computeBindGroup);
        computePass.dispatchWorkgroups(workGroupCount);
        computePass.end();

        // Finish encoding and submit the commands
        const computeCommandBuffer = computeEncoder.finish();
        device.queue.submit([computeCommandBuffer]);
    }

    ////////// RENDER //////////
    // Creating the vertex buffer
    const vertexBuffer = createBuffer(device, quadVertices, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);

    // Defining the vertex data structure
    const vertexBufferLayout = {
        arrayStride: 8,
        attributes: [{
            format: "float32x2",
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
        }],
    };

    const fragmentWGSL = await (await fetch('./fragment.wgsl')).text();

    // Copying the vertices into the buffer's memory
    device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, quadVertices);

    const renderBindGroupLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "storage" } },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "storage" } },
        ]
    })

    const renderPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            renderBindGroupLayout, // @group(0)
        ]
    });

    // Creating the render pipeline (conttrols how geometry is drawn, which shaders are used, etc.)
    const renderPipeline = device.createRenderPipeline({
        label: "Cell pipeline",
        layout: renderPipelineLayout,
        vertex: {
            module: device.createShaderModule({ code: fragmentWGSL }),
            entryPoint: "vertexMain",
            buffers: [vertexBufferLayout]
        },
        fragment: {
            module: device.createShaderModule({ code: fragmentWGSL }),
            entryPoint: "fragmentMain",
            targets: [{
                format: canvasFormat
            }]
        }
    });

    const renderBindGroup = device.createBindGroup({
        label: "Cell renderer bind group",
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: rezBuffer } },
            { binding: 1, resource: { buffer: timeBuffer } },
            { binding: 2, resource: { buffer: agentBuffer } },
            { binding: 3, resource: { buffer: textureBuffer } },
        ],
    });

    let lastTime = performance.now();

    resetCompute();

    const draw = () => {
        // Increment time
        timeUniformArray[0] += 1.0;
        device.queue.writeBuffer(rezBuffer, 0, rezUniformArray);
        device.queue.writeBuffer(timeBuffer, 0, timeUniformArray);

        ////////// COMPUTE PASS //////////
        // Encode commands to do the computation
        const computeEncoder = device.createCommandEncoder({
            label: 'doubling encoder',
        });
        const computePass = computeEncoder.beginComputePass({
            label: 'doubling compute pass',
        });

        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, computeBindGroup);
        computePass.dispatchWorkgroups(workGroupCount);
        computePass.end();

        // Finish encoding and submit the commands
        const computeCommandBuffer = computeEncoder.finish();
        device.queue.submit([computeCommandBuffer]);

        ////////// RENDER PASS //////////
        const renderEncoder = device.createCommandEncoder();

        const renderPass = renderEncoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r: 0, g: 0, b: 0.4, a: 1 }, // New line
                storeOp: "store",
            }]
        });

        renderPass.setPipeline(renderPipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setBindGroup(0, renderBindGroup); // New line!
        renderPass.draw(quadVertices.length / 2); // 6 vertices

        // Ending the render pass
        renderPass.end();
        const renderCommandBuffer = renderEncoder.finish();

        // Finish the command buffer and immediately submit it.
        device.queue.submit([renderCommandBuffer]);

        // Request the next animation frame
        requestAnimationFrame(draw);

        // let time = performance.now();
        // let timeDelta = time - lastTime;
        // lastTime = time;
        // console.log(Math.round(1000 / timeDelta))
    };

    // Start the drawing loop
    draw();
}
main()

function initializeRGBAData(resX, resY) {
    var pixelCount = resX * resY;
    const data = new Float32Array(pixelCount * 4); // 4 floats per pixel (RGBA)

    // Fill the buffer with some test data (red color for all pixels)
    for (let i = 0; i < pixelCount; i++) {
        data[i * 4 + 0] = 1.0; // R
        data[i * 4 + 1] = 0.0; // G
        data[i * 4 + 2] = 0.0; // B
        data[i * 4 + 3] = 1.0; // A
    }

    return data
}

function initializeAgentData(agentCount) {
    const data = new Float32Array(agentCount * 2); // agents = vec2
    return data
}