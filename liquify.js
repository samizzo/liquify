'use strict';

var NUM_VERTS = 32;
var RADIUS = 0.2;

var g_canvas, gl;
var g_image;
var g_buffer, g_texCoordBuffer, g_indicesBuffer, g_linesIndicesBuffer;
var g_positionLocation, g_texCoordLocation;
var g_imageUniform;
var g_texture;
var g_program, g_lineProgram;
var g_vertices, g_texCoords, g_indices, g_linesIndices;

var g_mouse = { mouseDown: false, mousePos: { x: 0, y: 0 } };

var g_showGrid = false;
var g_radiusElement;

function onImageLoaded() {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, g_image);
    render();
}

function onMouseDown(event) {
    g_mouse.mouseDown = event.button === 0;
}

function onMouseUp(event) {
    if (event.button === 0) {
        g_mouse.mouseDown = false;
    }
}

function distance(a, b) {
    var delta = { x: b.x - a.x, y: b.y - a.y };
    return Math.sqrt((delta.x*delta.x) + (delta.y*delta.y));
}

function length(a) {
    return Math.sqrt((a.x*a.x) + (a.y*a.y));
}

function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}

function mul(a, scalar) {
    return { x: a.x * scalar, y: a.y * scalar };
}

function normalise(a) {
    var l = length(a);
    return mul(a, 1 / l);
}

function onMouseMove(event) {
    if (g_mouse.mouseDown) {
        var pos = { x: 0, y: 0 };
        pos.x = (event.clientX / (g_canvas.width - 1));
        pos.y = (event.clientY / (g_canvas.height - 1));
        pos.x = (pos.x * 2) - 1;
        pos.y = 1 - (pos.y * 2);

        var repaint = false;

        for (var i = 0; i < g_vertices.length; i += 2) {
            var v = { x: g_vertices[i], y: g_vertices[i+1] };
            var l = distance(pos, v);
            if (l < RADIUS) {
                var dir = sub(v, pos);
                dir = mul(dir, l);
                if (event.ctrlKey) {
                    dir = mul(dir, l - RADIUS);
                } else {
                    dir = mul(dir, RADIUS - l);
                }
                v = add(v, dir);
                g_vertices[i] = v.x;
                g_vertices[i+1] = v.y;
                repaint = true;
            }
        }

        if (repaint) {
            render();
        }
    }
}

function init(doHandlers) {
    g_canvas = document.getElementById('canvas');

    g_radiusElement = document.getElementById('radius');
    g_radiusElement.value = RADIUS;

    if (doHandlers) {
        g_canvas.addEventListener('mousedown', onMouseDown, false);
        g_canvas.addEventListener('mouseup', onMouseUp, false);
        g_canvas.addEventListener('mousemove', onMouseMove, false);
    }

    gl = g_canvas.getContext('webgl') || g_canvas.getContext('experimental-webgl');

    // Load the shaders
    var vertexShader = window.createShaderFromScriptElement(gl, '2d-vertex-shader');
    var fragmentShader = window.createShaderFromScriptElement(gl, '2d-fragment-shader');
    g_program = window.createProgram(gl, [ vertexShader, fragmentShader ]);

    var lineFragmentShader = window.createShaderFromScriptElement(gl, '2d-fragment-line-shader');
    g_lineProgram = window.createProgram(gl, [ vertexShader, lineFragmentShader ]);

    g_positionLocation = gl.getAttribLocation(g_program, 'a_position');
    g_texCoordLocation = gl.getAttribLocation(g_program, 'a_texCoord');
    g_imageUniform = gl.getUniformLocation(g_program, 'u_image');

    gl.uniform1i(g_imageUniform, 0);

    g_buffer = gl.createBuffer();
    g_texCoordBuffer = gl.createBuffer();
    g_indicesBuffer = gl.createBuffer();
    g_linesIndicesBuffer = gl.createBuffer();

    g_texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g_texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    g_image = new Image();
    g_image.onload = onImageLoaded;
    g_image.crossOrigin = '';
    g_image.src = 'v2-cute-cat-picture.jpg';

    var numVerts = NUM_VERTS * NUM_VERTS;
    g_vertices = new Float32Array(numVerts * 2);
    g_texCoords = new Float32Array(numVerts * 2);

    var x, y;

    var vertIndex = 0;
    for (y = 0; y < NUM_VERTS; y++) {
        for (x = 0; x < NUM_VERTS; x++) {
            g_vertices[vertIndex] = ((x / (NUM_VERTS - 1)) * 2) - 1;
            g_vertices[vertIndex + 1] = ((y / (NUM_VERTS - 1)) * 2) - 1;

            g_texCoords[vertIndex] = (x / (NUM_VERTS - 1));
            g_texCoords[vertIndex + 1] = 1 - (y / (NUM_VERTS - 1));

            vertIndex += 2;
        }
    }

    vertIndex = 0;
    var numTriangles = ((NUM_VERTS - 1) * (NUM_VERTS - 1)) * 2;
    g_indices = new Uint16Array(numTriangles * 3);

    var numLines = numTriangles * 2;
    g_linesIndices = new Uint16Array(numLines * 4);

    var triangleIndex = 0;
    var lineIndex = 0;

    for (y = 0; y < NUM_VERTS - 1; y++) {
        for (x = 0; x < NUM_VERTS - 1; x++) {
            g_indices[triangleIndex] = vertIndex;
            g_indices[triangleIndex + 1] = vertIndex + 1;
            g_indices[triangleIndex + 2] = vertIndex + NUM_VERTS;

            g_indices[triangleIndex + 3] = vertIndex + 1;
            g_indices[triangleIndex + 4] = vertIndex + 1 + NUM_VERTS;
            g_indices[triangleIndex + 5] = vertIndex + NUM_VERTS;

            g_linesIndices[lineIndex] = vertIndex;
            g_linesIndices[lineIndex + 1] = vertIndex + 1;
            g_linesIndices[lineIndex + 2] = vertIndex + 1;
            g_linesIndices[lineIndex + 3] = vertIndex + 1 + NUM_VERTS;
            g_linesIndices[lineIndex + 4] = vertIndex + 1 + NUM_VERTS;
            g_linesIndices[lineIndex + 5] = vertIndex + NUM_VERTS;
            g_linesIndices[lineIndex + 6] = vertIndex + NUM_VERTS;
            g_linesIndices[lineIndex + 7] = vertIndex;

            triangleIndex += 6;
            lineIndex += 8;
            vertIndex++;
        }

        vertIndex++;
    }

    render();
}

function render() {
    gl.disable(gl.CULL_FACE);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, g_vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(g_positionLocation);
    gl.vertexAttribPointer(g_positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, g_texCoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(g_texCoordLocation);
    gl.vertexAttribPointer(g_texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(g_program);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g_indices, gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, g_indices.length, gl.UNSIGNED_SHORT, 0);

    if (!g_showGrid) {
        return;
    }

    gl.useProgram(g_lineProgram);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_linesIndicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g_linesIndices, gl.STATIC_DRAW);
    gl.drawElements(gl.LINES, g_linesIndices.length, gl.UNSIGNED_SHORT, 0);
}

function onNumVerts() {
    var numVertsElem = document.getElementById('numVerts');
    var numVerts = numVertsElem.value;
    numVerts = parseInt(numVerts) || 0;
    if (numVerts <= 0) {
        numVertsElem.value = NUM_VERTS;
        return;
    }

    NUM_VERTS = numVerts;
    init(false);
}

function onRadius() {
    var radius = parseFloat(g_radiusElement.value) || 0;
    if (radius <= 0) {
        g_radiusElement.value = RADIUS;
        return;
    }

    RADIUS = radius;
}

function onShowGrid() {
    g_showGrid = !g_showGrid;
    render();
}
