/**
 * E2E Automated Test Harness: Interstellar Gesture Experience
 * 
 * Standalone headless test environment simulating:
 * - DOM (Window, Document, Elements, Event handling, RAF)
 * - Canvas & WebGL2 rendering context mocks (complete constants and shaders/buffers/textures mock)
 * - Web Audio API mock (AudioContext, GainNode, OscillatorNode, ConvolverNode, BiquadFilterNode, WaveShaperNode, DelayNode, DynamicsCompressorNode, MediaStreamAudioDestinationNode)
 * - Canvas MediaRecorder & MediaStream API mock
 * - SyntheticGestureSimulator (21 3D MediaPipe hand landmarks, gestures, metric calculation)
 * - SpringPhysics Simulator
 * - Test Framework (describe, it, beforeEach, afterEach, expect)
 */

// ============================================================================
// 1. WebGL & WebGL2 Mock Definitions
// ============================================================================

export interface WebGLMockState {
  drawCalls: number;
  programsCreated: number;
  shadersCompiled: number;
  buffersCreated: number;
  texturesCreated: number;
  framebuffersCreated: number;
  uniforms: Map<string, any>;
  attributes: Map<string, any>;
  viewport: { x: number; y: number; width: number; height: number };
  clearColor: [number, number, number, number];
  capabilities: Map<number, boolean>;
  activeProgram: any;
}

export class MockWebGL2RenderingContext {
  // WebGL 1 & 2 Constants
  static readonly COLOR_BUFFER_BIT = 16384;
  static readonly DEPTH_BUFFER_BIT = 256;
  static readonly STENCIL_BUFFER_BIT = 1024;
  static readonly TRIANGLES = 4;
  static readonly TRIANGLE_STRIP = 5;
  static readonly POINTS = 0;
  static readonly LINES = 1;
  static readonly LINE_STRIP = 3;
  static readonly FLOAT = 5126;
  static readonly HALF_FLOAT = 5131;
  static readonly UNSIGNED_BYTE = 5121;
  static readonly UNSIGNED_SHORT = 5123;
  static readonly UNSIGNED_INT = 5125;
  static readonly INT = 5124;
  static readonly BYTE = 5120;
  static readonly SHORT = 5122;
  static readonly RGBA = 6408;
  static readonly RGB = 6407;
  static readonly RGBA32F = 34836;
  static readonly RGBA16F = 34842;
  static readonly DEPTH_COMPONENT16 = 33189;
  static readonly DEPTH_COMPONENT24 = 33190;
  static readonly DEPTH_COMPONENT32F = 36012;
  static readonly DEPTH24_STENCIL8 = 35056;
  static readonly VERTEX_SHADER = 35633;
  static readonly FRAGMENT_SHADER = 35632;
  static readonly COMPILE_STATUS = 35713;
  static readonly LINK_STATUS = 35714;
  static readonly ARRAY_BUFFER = 34962;
  static readonly ELEMENT_ARRAY_BUFFER = 34963;
  static readonly STATIC_DRAW = 35044;
  static readonly DYNAMIC_DRAW = 35048;
  static readonly STREAM_DRAW = 35040;
  static readonly TEXTURE_2D = 3553;
  static readonly TEXTURE_CUBE_MAP = 34067;
  static readonly TEXTURE0 = 33984;
  static readonly TEXTURE_MIN_FILTER = 10241;
  static readonly TEXTURE_MAG_FILTER = 10240;
  static readonly TEXTURE_WRAP_S = 10242;
  static readonly TEXTURE_WRAP_T = 10243;
  static readonly LINEAR = 9729;
  static readonly NEAREST = 9728;
  static readonly LINEAR_MIPMAP_LINEAR = 9987;
  static readonly CLAMP_TO_EDGE = 33071;
  static readonly REPEAT = 10497;
  static readonly MIRRORED_REPEAT = 33648;
  static readonly DEPTH_TEST = 2929;
  static readonly BLEND = 3042;
  static readonly CULL_FACE = 2884;
  static readonly SCISSOR_TEST = 3089;
  static readonly SRC_ALPHA = 770;
  static readonly ONE_MINUS_SRC_ALPHA = 771;
  static readonly ONE = 1;
  static readonly ZERO = 0;
  static readonly DST_ALPHA = 772;
  static readonly ONE_MINUS_DST_ALPHA = 773;
  static readonly FUNC_ADD = 32774;
  static readonly FRAMEBUFFER = 36160;
  static readonly COLOR_ATTACHMENT0 = 36064;
  static readonly DEPTH_ATTACHMENT = 36096;
  static readonly FRAMEBUFFER_COMPLETE = 36053;
  static readonly RENDERBUFFER = 36161;
  static readonly MAX_TEXTURE_SIZE = 3379;
  static readonly MAX_VERTEX_ATTRIBS = 34921;
  static readonly MAX_VERTEX_UNIFORM_VECTORS = 36347;
  static readonly MAX_FRAGMENT_UNIFORM_VECTORS = 36349;
  static readonly MAX_RENDERBUFFER_SIZE = 34024;
  static readonly VERSION = 7938;
  static readonly SHADING_LANGUAGE_VERSION = 35724;
  static readonly VENDOR = 7936;
  static readonly RENDERER = 7937;
  static readonly MAX_DRAW_BUFFERS = 34852;
  static readonly MAX_SAMPLES = 36183;
  static readonly UNPACK_ALIGNMENT = 3317;

  // Instance constants mirror statics
  readonly VERSION = MockWebGL2RenderingContext.VERSION;
  readonly SHADING_LANGUAGE_VERSION = MockWebGL2RenderingContext.SHADING_LANGUAGE_VERSION;
  readonly VENDOR = MockWebGL2RenderingContext.VENDOR;
  readonly RENDERER = MockWebGL2RenderingContext.RENDERER;
  readonly MAX_DRAW_BUFFERS = MockWebGL2RenderingContext.MAX_DRAW_BUFFERS;
  readonly MAX_SAMPLES = MockWebGL2RenderingContext.MAX_SAMPLES;
  readonly UNPACK_ALIGNMENT = MockWebGL2RenderingContext.UNPACK_ALIGNMENT;
  readonly COLOR_BUFFER_BIT = MockWebGL2RenderingContext.COLOR_BUFFER_BIT;
  readonly DEPTH_BUFFER_BIT = MockWebGL2RenderingContext.DEPTH_BUFFER_BIT;
  readonly STENCIL_BUFFER_BIT = MockWebGL2RenderingContext.STENCIL_BUFFER_BIT;
  readonly TRIANGLES = MockWebGL2RenderingContext.TRIANGLES;
  readonly TRIANGLE_STRIP = MockWebGL2RenderingContext.TRIANGLE_STRIP;
  readonly POINTS = MockWebGL2RenderingContext.POINTS;
  readonly LINES = MockWebGL2RenderingContext.LINES;
  readonly FLOAT = MockWebGL2RenderingContext.FLOAT;
  readonly HALF_FLOAT = MockWebGL2RenderingContext.HALF_FLOAT;
  readonly UNSIGNED_BYTE = MockWebGL2RenderingContext.UNSIGNED_BYTE;
  readonly UNSIGNED_SHORT = MockWebGL2RenderingContext.UNSIGNED_SHORT;
  readonly UNSIGNED_INT = MockWebGL2RenderingContext.UNSIGNED_INT;
  static readonly ACTIVE_UNIFORMS = 35718;
  static readonly ACTIVE_ATTRIBUTES = 35721;
  static readonly TRANSFORM_FEEDBACK_VARYINGS = 35971;

  readonly ACTIVE_UNIFORMS = 35718;
  readonly ACTIVE_ATTRIBUTES = 35721;
  readonly TRANSFORM_FEEDBACK_VARYINGS = 35971;
  readonly RGBA = MockWebGL2RenderingContext.RGBA;
  readonly RGB = MockWebGL2RenderingContext.RGB;
  readonly VERTEX_SHADER = MockWebGL2RenderingContext.VERTEX_SHADER;
  readonly FRAGMENT_SHADER = MockWebGL2RenderingContext.FRAGMENT_SHADER;
  readonly COMPILE_STATUS = MockWebGL2RenderingContext.COMPILE_STATUS;
  readonly LINK_STATUS = MockWebGL2RenderingContext.LINK_STATUS;
  readonly ARRAY_BUFFER = MockWebGL2RenderingContext.ARRAY_BUFFER;
  readonly ELEMENT_ARRAY_BUFFER = MockWebGL2RenderingContext.ELEMENT_ARRAY_BUFFER;
  readonly STATIC_DRAW = MockWebGL2RenderingContext.STATIC_DRAW;
  readonly DYNAMIC_DRAW = MockWebGL2RenderingContext.DYNAMIC_DRAW;
  readonly TEXTURE_2D = MockWebGL2RenderingContext.TEXTURE_2D;
  readonly TEXTURE0 = MockWebGL2RenderingContext.TEXTURE0;
  readonly TEXTURE_MIN_FILTER = MockWebGL2RenderingContext.TEXTURE_MIN_FILTER;
  readonly TEXTURE_MAG_FILTER = MockWebGL2RenderingContext.TEXTURE_MAG_FILTER;
  readonly LINEAR = MockWebGL2RenderingContext.LINEAR;
  readonly NEAREST = MockWebGL2RenderingContext.NEAREST;
  readonly CLAMP_TO_EDGE = MockWebGL2RenderingContext.CLAMP_TO_EDGE;
  readonly DEPTH_TEST = MockWebGL2RenderingContext.DEPTH_TEST;
  readonly BLEND = MockWebGL2RenderingContext.BLEND;
  readonly CULL_FACE = MockWebGL2RenderingContext.CULL_FACE;
  readonly SRC_ALPHA = MockWebGL2RenderingContext.SRC_ALPHA;
  readonly ONE_MINUS_SRC_ALPHA = MockWebGL2RenderingContext.ONE_MINUS_SRC_ALPHA;
  readonly ONE = MockWebGL2RenderingContext.ONE;
  readonly ZERO = MockWebGL2RenderingContext.ZERO;
  readonly FRAMEBUFFER = MockWebGL2RenderingContext.FRAMEBUFFER;
  readonly COLOR_ATTACHMENT0 = MockWebGL2RenderingContext.COLOR_ATTACHMENT0;
  readonly DEPTH_ATTACHMENT = MockWebGL2RenderingContext.DEPTH_ATTACHMENT;
  readonly FRAMEBUFFER_COMPLETE = MockWebGL2RenderingContext.FRAMEBUFFER_COMPLETE;
  readonly RENDERBUFFER = MockWebGL2RenderingContext.RENDERBUFFER;

  canvas: any;
  state: WebGLMockState;
  private idCounter = 1;

  constructor(canvas: any) {
    this.canvas = canvas;
    this.state = {
      drawCalls: 0,
      programsCreated: 0,
      shadersCompiled: 0,
      buffersCreated: 0,
      texturesCreated: 0,
      framebuffersCreated: 0,
      uniforms: new Map(),
      attributes: new Map(),
      viewport: { x: 0, y: 0, width: canvas.width || 800, height: canvas.height || 600 },
      clearColor: [0, 0, 0, 1],
      capabilities: new Map(),
      activeProgram: null
    };
  }

  createShader(type: number) {
    return { id: this.idCounter++, type, source: '', compiled: true };
  }

  shaderSource(shader: any, source: string) {
    if (shader) shader.source = source;
  }

  compileShader(shader: any) {
    if (shader) {
      shader.compiled = true;
      this.state.shadersCompiled++;
    }
  }

  getShaderParameter(shader: any, pname: number) {
    if (pname === MockWebGL2RenderingContext.COMPILE_STATUS) return true;
    return 1;
  }

  getShaderInfoLog() { return ''; }
  deleteShader() {}

  createProgram() {
    this.state.programsCreated++;
    return { id: this.idCounter++, shaders: [], linked: true, uniforms: new Map() };
  }

  attachShader(program: any, shader: any) {
    if (program && shader) program.shaders.push(shader);
  }

  linkProgram(program: any) {
    if (program) program.linked = true;
  }

  getProgramParameter(program: any, pname: number) {
    if (pname === MockWebGL2RenderingContext.LINK_STATUS) return true;
    if (pname === 35718 || pname === 35721 || pname === 35971) return 0;
    return 1;
  }

  getProgramInfoLog() { return ''; }
  useProgram(program: any) {
    this.state.activeProgram = program;
  }
  deleteProgram() {}

  createBuffer() {
    this.state.buffersCreated++;
    return { id: this.idCounter++, data: null, target: 0 };
  }

  bindBuffer(target: number, buffer: any) {
    if (buffer) buffer.target = target;
  }

  bufferData(target: number, data: any, usage: number) {
    // Stores buffer data in memory
  }

  bufferSubData() {}
  deleteBuffer() {}

  createTexture() {
    this.state.texturesCreated++;
    return { id: this.idCounter++, width: 0, height: 0, format: 0 };
  }

  bindTexture() {}
  texImage2D() {}
  texParameteri() {}
  activeTexture() {}
  deleteTexture() {}
  generateMipmap() {}

  createFramebuffer() {
    this.state.framebuffersCreated++;
    return { id: this.idCounter++ };
  }

  bindFramebuffer() {}
  framebufferTexture2D() {}
  checkFramebufferStatus() { return MockWebGL2RenderingContext.FRAMEBUFFER_COMPLETE; }
  deleteFramebuffer() {}

  createRenderbuffer() { return { id: this.idCounter++ }; }
  bindRenderbuffer() {}
  renderbufferStorage() {}
  framebufferRenderbuffer() {}
  deleteRenderbuffer() {}

  createVertexArray() { return { id: this.idCounter++ }; }
  bindVertexArray() {}
  deleteVertexArray() {}

  viewport(x: number, y: number, width: number, height: number) {
    this.state.viewport = { x, y, width, height };
  }

  scissor(x?: number, y?: number, width?: number, height?: number) {}
  clear(mask: number) {}
  clearColor(r: number, g: number, b: number, a: number) {
    this.state.clearColor = [r, g, b, a];
  }
  clearDepth(depth?: number) {}
  clearStencil(stencil?: number) {}
  stencilMask(mask: number) {}
  stencilFunc(func: number, ref: number, mask: number) {}
  stencilOp(fail: number, zfail: number, zpass: number) {}
  stencilMaskSeparate(face: number, mask: number) {}
  stencilFuncSeparate(face: number, func: number, ref: number, mask: number) {}
  stencilOpSeparate(face: number, fail: number, zfail: number, zpass: number) {}
  colorMask(r: boolean, g: boolean, b: boolean, a: boolean) {}
  polygonOffset(factor: number, units: number) {}
  lineWidth(width: number) {}
  drawBuffers(buffers: number[]) {}
  getContextAttributes() {
    return { alpha: true, depth: true, stencil: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false };
  }
  getShaderPrecisionFormat(shadertype: number, precisiontype: number) {
    return { rangeMin: 127, rangeMax: 127, precision: 23 };
  }
  enable(cap: number) { this.state.capabilities.set(cap, true); }
  disable(cap: number) { this.state.capabilities.set(cap, false); }
  blendFunc(sfactor: number, dfactor: number) {}
  blendFuncSeparate(srcRGB: number, dstRGB: number, srcAlpha: number, dstAlpha: number) {}
  blendEquation(mode: number) {}
  blendEquationSeparate(modeRGB: number, modeAlpha: number) {}
  depthFunc(func: number) {}
  depthMask(flag: boolean) {}
  cullFace(mode: number) {}
  frontFace(mode: number) {}

  getAttribLocation(program: any, name: string) { return 0; }
  enableVertexAttribArray() {}
  disableVertexAttribArray() {}
  vertexAttribPointer() {}

  getUniformLocation(program: any, name: string) { return { name }; }
  uniform1f(loc: any, v: number) { if (loc) this.state.uniforms.set(loc.name, v); }
  uniform2f(loc: any, x: number, y: number) { if (loc) this.state.uniforms.set(loc.name, [x, y]); }
  uniform3f(loc: any, x: number, y: number, z: number) { if (loc) this.state.uniforms.set(loc.name, [x, y, z]); }
  uniform4f(loc: any, x: number, y: number, z: number, w: number) { if (loc) this.state.uniforms.set(loc.name, [x, y, z, w]); }
  uniform1i(loc: any, v: number) { if (loc) this.state.uniforms.set(loc.name, v); }
  uniformMatrix4fv(loc: any, transpose: boolean, v: Float32Array | number[]) { if (loc) this.state.uniforms.set(loc.name, v); }
  uniformMatrix3fv(loc: any, transpose: boolean, v: Float32Array | number[]) { if (loc) this.state.uniforms.set(loc.name, v); }

  drawArrays(mode: number, first: number, count: number) {
    this.state.drawCalls++;
  }

  drawElements(mode: number, count: number, type: number, offset: number) {
    this.state.drawCalls++;
  }

  drawArraysInstanced(mode: number, first: number, count: number, instanceCount: number) {
    this.state.drawCalls++;
  }

  drawElementsInstanced(mode: number, count: number, type: number, offset: number, instanceCount: number) {
    this.state.drawCalls++;
  }

  getExtension(name: string) {
    return {
      drawBuffersWEBGL: () => {},
      loseContext: () => {},
      restoreContext: () => {},
      createVertexArrayOES: () => this.createVertexArray(),
      bindVertexArrayOES: (vao: any) => this.bindVertexArray(),
      deleteVertexArrayOES: (vao: any) => this.deleteVertexArray(),
    };
  }

  getActiveUniform(program: any, index: number) {
    return { name: `u_mock_${index}`, size: 1, type: 5126 };
  }

  getActiveAttrib(program: any, index: number) {
    return { name: `a_mock_${index}`, size: 1, type: 5126 };
  }

  getParameter(pname: number) {
    if (pname === 7938) return 'WebGL 2.0 (MockWebGL2)'; // VERSION
    if (pname === 35724) return 'WebGL GLSL ES 3.00 (MockWebGL2)'; // SHADING_LANGUAGE_VERSION
    if (pname === 7936) return 'WebKit'; // VENDOR
    if (pname === 7937) return 'WebKit WebGL'; // RENDERER
    if (pname === MockWebGL2RenderingContext.MAX_TEXTURE_SIZE) return 16384;
    if (pname === MockWebGL2RenderingContext.MAX_VERTEX_ATTRIBS) return 16;
    if (pname === MockWebGL2RenderingContext.MAX_VERTEX_UNIFORM_VECTORS) return 1024;
    if (pname === MockWebGL2RenderingContext.MAX_FRAGMENT_UNIFORM_VECTORS) return 1024;
    if (pname === 34852) return 8; // MAX_DRAW_BUFFERS
    return 1;
  }

  pixelStorei() {}
  readPixels() {}
  flush() {}
  finish() {}
}

// ============================================================================
// 2. Web Audio API Mock Definitions
// ============================================================================

export interface ScheduledEvent {
  type: 'setValue' | 'linearRamp' | 'exponentialRamp' | 'setTarget' | 'setValueCurve';
  value: number;
  time: number;
  timeConstant?: number;
  duration?: number;
}

export class MockAudioParam {
  value: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  events: ScheduledEvent[] = [];

  constructor(defaultValue: number, min = -3.4e38, max = 3.4e38) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
    this.minValue = min;
    this.maxValue = max;
  }

  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: 'setValue', value, time });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: 'linearRamp', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: 'exponentialRamp', value, time });
    return this;
  }

  setTargetAtTime(target: number, startTime: number, timeConstant: number) {
    this.value = target;
    this.events.push({ type: 'setTarget', value: target, time: startTime, timeConstant });
    return this;
  }

  setValueCurveAtTime(values: Float32Array | number[], startTime: number, duration: number) {
    if (values.length > 0) this.value = values[values.length - 1];
    this.events.push({ type: 'setValueCurve', value: this.value, time: startTime, duration });
    return this;
  }

  cancelScheduledValues(startTime: number) {
    this.events = this.events.filter(e => e.time < startTime);
    return this;
  }

  getValueAtTime(time: number): number {
    if (this.events.length === 0) return this.value;
    // Find last scheduled event before or at time
    let lastVal = this.defaultValue;
    for (const ev of this.events) {
      if (ev.time <= time) {
        lastVal = ev.value;
      }
    }
    return lastVal;
  }
}

export class MockAudioNode {
  context: MockAudioContext;
  numberOfInputs: number;
  numberOfOutputs: number;
  connectedOutputs: Array<MockAudioNode | MockAudioParam> = [];

  constructor(context: MockAudioContext, inputs = 1, outputs = 1) {
    this.context = context;
    this.numberOfInputs = inputs;
    this.numberOfOutputs = outputs;
  }

  connect(destination: MockAudioNode | MockAudioParam, outputIndex = 0, inputIndex = 0): any {
    this.connectedOutputs.push(destination);
    return destination;
  }

  disconnect(destination?: MockAudioNode | MockAudioParam): void {
    if (destination) {
      this.connectedOutputs = this.connectedOutputs.filter(node => node !== destination);
    } else {
      this.connectedOutputs = [];
    }
  }
}

export class MockGainNode extends MockAudioNode {
  gain: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context, 1, 1);
    this.gain = new MockAudioParam(1.0, 0, 100);
  }
}

export class MockOscillatorNode extends MockAudioNode {
  type: OscillatorType = 'sine';
  frequency: MockAudioParam;
  detune: MockAudioParam;
  started = false;
  stopped = false;
  startTime = 0;
  stopTime = 0;

  constructor(context: MockAudioContext) {
    super(context, 0, 1);
    this.frequency = new MockAudioParam(440, 0, 24000);
    this.detune = new MockAudioParam(0, -153600, 153600);
  }

  start(time = 0) {
    this.started = true;
    this.startTime = time;
  }

  stop(time = 0) {
    this.stopped = true;
    this.stopTime = time;
  }
}

export class MockConvolverNode extends MockAudioNode {
  buffer: MockAudioBuffer | null = null;
  normalize = true;

  constructor(context: MockAudioContext) {
    super(context, 1, 1);
  }
}

export class MockBiquadFilterNode extends MockAudioNode {
  type: BiquadFilterType = 'lowpass';
  frequency: MockAudioParam;
  Q: MockAudioParam;
  gain: MockAudioParam;
  detune: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context, 1, 1);
    this.frequency = new MockAudioParam(350, 0, 24000);
    this.Q = new MockAudioParam(1, 0.0001, 1000);
    this.gain = new MockAudioParam(0, -40, 40);
    this.detune = new MockAudioParam(0, -153600, 153600);
  }
}

export class MockWaveShaperNode extends MockAudioNode {
  curve: Float32Array | null = null;
  oversample: OverSampleType = 'none';

  constructor(context: MockAudioContext) {
    super(context, 1, 1);
  }
}

export class MockDelayNode extends MockAudioNode {
  delayTime: MockAudioParam;

  constructor(context: MockAudioContext, maxDelayTime = 1.0) {
    super(context, 1, 1);
    this.delayTime = new MockAudioParam(0, 0, maxDelayTime);
  }
}

export class MockDynamicsCompressorNode extends MockAudioNode {
  threshold: MockAudioParam;
  knee: MockAudioParam;
  ratio: MockAudioParam;
  attack: MockAudioParam;
  release: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context, 1, 1);
    this.threshold = new MockAudioParam(-24, -100, 0);
    this.knee = new MockAudioParam(30, 0, 40);
    this.ratio = new MockAudioParam(12, 1, 20);
    this.attack = new MockAudioParam(0.003, 0, 1);
    this.release = new MockAudioParam(0.25, 0, 1);
  }
}

export class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private channelData: Float32Array[];

  constructor(options: { numberOfChannels?: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels || 2;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = this.length / this.sampleRate;
    this.channelData = [];
    for (let c = 0; c < this.numberOfChannels; c++) {
      this.channelData.push(new Float32Array(this.length));
    }
  }

  getChannelData(channel: number): Float32Array {
    if (channel >= this.numberOfChannels) throw new Error('IndexSizeError');
    return this.channelData[channel];
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel = 0) {
    const src = this.getChannelData(channelNumber);
    for (let i = 0; i < destination.length; i++) {
      destination[i] = src[startInChannel + i] || 0;
    }
  }
}

export class MockAudioDestinationNode extends MockAudioNode {
  maxChannelCount = 2;
  constructor(context: MockAudioContext) {
    super(context, 1, 0);
  }
}

export class MockMediaStreamAudioDestinationNode extends MockAudioNode {
  stream: MockMediaStream;
  constructor(context: MockAudioContext) {
    super(context, 1, 0);
    this.stream = new MockMediaStream([new MockMediaStreamTrack('audio')]);
  }
}

export class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination: MockAudioDestinationNode;
  nodes: MockAudioNode[] = [];

  constructor() {
    this.destination = new MockAudioDestinationNode(this);
  }

  createGain(): MockGainNode {
    const node = new MockGainNode(this);
    this.nodes.push(node);
    return node;
  }

  createOscillator(): MockOscillatorNode {
    const node = new MockOscillatorNode(this);
    this.nodes.push(node);
    return node;
  }

  createConvolver(): MockConvolverNode {
    const node = new MockConvolverNode(this);
    this.nodes.push(node);
    return node;
  }

  createBiquadFilter(): MockBiquadFilterNode {
    const node = new MockBiquadFilterNode(this);
    this.nodes.push(node);
    return node;
  }

  createWaveShaper(): MockWaveShaperNode {
    const node = new MockWaveShaperNode(this);
    this.nodes.push(node);
    return node;
  }

  createDelay(maxDelayTime = 1.0): MockDelayNode {
    const node = new MockDelayNode(this, maxDelayTime);
    this.nodes.push(node);
    return node;
  }

  createDynamicsCompressor(): MockDynamicsCompressorNode {
    const node = new MockDynamicsCompressorNode(this);
    this.nodes.push(node);
    return node;
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  createMediaStreamDestination(): MockMediaStreamAudioDestinationNode {
    const node = new MockMediaStreamAudioDestinationNode(this);
    this.nodes.push(node);
    return node;
  }

  advanceTime(seconds: number) {
    this.currentTime += seconds;
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }
}

// ============================================================================
// 3. MediaRecorder & MediaStream Mock Definitions
// ============================================================================

export class MockMediaStreamTrack {
  kind: 'audio' | 'video';
  enabled = true;
  id: string;
  readyState: 'live' | 'ended' = 'live';

  constructor(kind: 'audio' | 'video') {
    this.kind = kind;
    this.id = `track-${Math.random().toString(36).substring(2, 9)}`;
  }

  stop() {
    this.readyState = 'ended';
  }
}

export class MockMediaStream {
  id: string;
  tracks: MockMediaStreamTrack[] = [];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.id = `stream-${Math.random().toString(36).substring(2, 9)}`;
    this.tracks = [...tracks];
  }

  getTracks(): MockMediaStreamTrack[] {
    return [...this.tracks];
  }

  getVideoTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter(t => t.kind === 'video');
  }

  getAudioTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter(t => t.kind === 'audio');
  }

  addTrack(track: MockMediaStreamTrack) {
    this.tracks.push(track);
  }

  removeTrack(track: MockMediaStreamTrack) {
    this.tracks = this.tracks.filter(t => t !== track);
  }
}

export class MockMediaRecorder {
  stream: MockMediaStream;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: any }) => void) | null = null;
  onstop: (() => void) | null = null;
  recordedBlobs: any[] = [];

  constructor(stream: MockMediaStream, options?: { mimeType?: string }) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'video/webm;codecs=vp9';
  }

  static isTypeSupported(type: string): boolean {
    return type.includes('webm') || type.includes('mp4');
  }

  start(timeslice?: number) {
    this.state = 'recording';
    this.recordedBlobs = [];
  }

  stop() {
    this.state = 'inactive';
    const blob = { size: 1024 * 1024 * 2, type: this.mimeType };
    this.recordedBlobs.push(blob);
    if (this.ondataavailable) {
      this.ondataavailable({ data: blob });
    }
    if (this.onstop) {
      this.onstop();
    }
  }

  pause() {
    this.state = 'paused';
  }

  resume() {
    this.state = 'recording';
  }

  requestData() {
    if (this.ondataavailable && this.recordedBlobs.length > 0) {
      this.ondataavailable({ data: this.recordedBlobs[0] });
    }
  }
}

// ============================================================================
// 4. Synthetic Gesture Simulator & MediaPipe Landmark Modeling
// ============================================================================

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export interface GestureMetrics {
  openness: number;
  pinchDistance: number;
  palmScale: number;
  yaw: number;
  pitch: number;
  roll: number;
  fingerStates: number[];
  centroid: { x: number; y: number; z: number };
}

export class SyntheticGestureSimulator {
  /**
   * Generates standard 21-landmark open hand.
   * Open fingers extend outwards from MCP joints.
   */
  static createOpenHand(center = { x: 0.5, y: 0.5, z: 0.0 }): Landmark3D[] {
    const landmarks: Landmark3D[] = [];
    const wrist: Landmark3D = { x: center.x, y: center.y + 0.15, z: center.z };
    landmarks.push(wrist); // 0: Wrist

    // Thumb (1..4)
    landmarks.push({ x: center.x - 0.04, y: center.y + 0.10, z: center.z }); // 1: CMC
    landmarks.push({ x: center.x - 0.08, y: center.y + 0.06, z: center.z }); // 2: MCP
    landmarks.push({ x: center.x - 0.11, y: center.y + 0.02, z: center.z }); // 3: IP
    landmarks.push({ x: center.x - 0.14, y: center.y - 0.02, z: center.z }); // 4: Tip

    // Index (5..8)
    landmarks.push({ x: center.x - 0.04, y: center.y + 0.02, z: center.z }); // 5: MCP
    landmarks.push({ x: center.x - 0.05, y: center.y - 0.05, z: center.z }); // 6: PIP
    landmarks.push({ x: center.x - 0.06, y: center.y - 0.10, z: center.z }); // 7: DIP
    landmarks.push({ x: center.x - 0.06, y: center.y - 0.15, z: center.z }); // 8: Tip

    // Middle (9..12)
    landmarks.push({ x: center.x, y: center.y + 0.01, z: center.z });        // 9: MCP
    landmarks.push({ x: center.x, y: center.y - 0.07, z: center.z });        // 10: PIP
    landmarks.push({ x: center.x, y: center.y - 0.13, z: center.z });        // 11: DIP
    landmarks.push({ x: center.x, y: center.y - 0.18, z: center.z });        // 12: Tip

    // Ring (13..16)
    landmarks.push({ x: center.x + 0.04, y: center.y + 0.02, z: center.z }); // 13: MCP
    landmarks.push({ x: center.x + 0.04, y: center.y - 0.05, z: center.z }); // 14: PIP
    landmarks.push({ x: center.x + 0.05, y: center.y - 0.10, z: center.z }); // 15: DIP
    landmarks.push({ x: center.x + 0.05, y: center.y - 0.14, z: center.z }); // 16: Tip

    // Pinky (17..20)
    landmarks.push({ x: center.x + 0.07, y: center.y + 0.04, z: center.z }); // 17: MCP
    landmarks.push({ x: center.x + 0.08, y: center.y - 0.02, z: center.z }); // 18: PIP
    landmarks.push({ x: center.x + 0.09, y: center.y - 0.06, z: center.z }); // 19: DIP
    landmarks.push({ x: center.x + 0.09, y: center.y - 0.10, z: center.z }); // 20: Tip

    return landmarks;
  }

  /**
   * Generates standard 21-landmark clenched fist.
   * Fingertips fold back tightly towards palm base (MCPs).
   */
  static createFist(center = { x: 0.5, y: 0.5, z: 0.0 }): Landmark3D[] {
    const landmarks: Landmark3D[] = [];
    const wrist: Landmark3D = { x: center.x, y: center.y + 0.12, z: center.z };
    landmarks.push(wrist); // 0: Wrist

    // Thumb curled over fingers (1..4)
    landmarks.push({ x: center.x - 0.03, y: center.y + 0.08, z: center.z + 0.01 });
    landmarks.push({ x: center.x - 0.04, y: center.y + 0.05, z: center.z + 0.02 });
    landmarks.push({ x: center.x - 0.01, y: center.y + 0.04, z: center.z + 0.03 });
    landmarks.push({ x: center.x + 0.01, y: center.y + 0.04, z: center.z + 0.03 }); // 4: Tip curled in

    // Index curled (5..8)
    landmarks.push({ x: center.x - 0.03, y: center.y + 0.02, z: center.z });
    landmarks.push({ x: center.x - 0.03, y: center.y - 0.01, z: center.z + 0.02 });
    landmarks.push({ x: center.x - 0.03, y: center.y + 0.03, z: center.z + 0.02 });
    landmarks.push({ x: center.x - 0.03, y: center.y + 0.06, z: center.z + 0.01 }); // 8: Tip curled to palm

    // Middle curled (9..12)
    landmarks.push({ x: center.x, y: center.y + 0.01, z: center.z });
    landmarks.push({ x: center.x, y: center.y - 0.02, z: center.z + 0.02 });
    landmarks.push({ x: center.x, y: center.y + 0.02, z: center.z + 0.02 });
    landmarks.push({ x: center.x, y: center.y + 0.05, z: center.z + 0.01 }); // 12: Tip curled to palm

    // Ring curled (13..16)
    landmarks.push({ x: center.x + 0.03, y: center.y + 0.02, z: center.z });
    landmarks.push({ x: center.x + 0.03, y: center.y - 0.01, z: center.z + 0.02 });
    landmarks.push({ x: center.x + 0.03, y: center.y + 0.03, z: center.z + 0.02 });
    landmarks.push({ x: center.x + 0.03, y: center.y + 0.06, z: center.z + 0.01 }); // 16: Tip curled to palm

    // Pinky curled (17..20)
    landmarks.push({ x: center.x + 0.05, y: center.y + 0.03, z: center.z });
    landmarks.push({ x: center.x + 0.05, y: center.y + 0.01, z: center.z + 0.02 });
    landmarks.push({ x: center.x + 0.05, y: center.y + 0.04, z: center.z + 0.02 });
    landmarks.push({ x: center.x + 0.05, y: center.y + 0.07, z: center.z + 0.01 }); // 20: Tip curled to palm

    return landmarks;
  }

  /**
   * Generates Two-Finger Pinch gesture.
   * Thumb tip (4) and Index tip (8) touch or are closely spaced.
   * @param pinchAmount 0.0 = wide open, 1.0 = fully pinched touching
   */
  static createPinchHand(center = { x: 0.5, y: 0.5, z: 0.0 }, pinchAmount = 1.0): Landmark3D[] {
    const hand = SyntheticGestureSimulator.createOpenHand(center);
    // Move thumb tip (4) and index tip (8) towards each other
    const targetX = center.x - 0.06;
    const targetY = center.y - 0.05;

    // Current thumb tip & index tip
    hand[4].x = hand[4].x + (targetX - hand[4].x) * pinchAmount;
    hand[4].y = hand[4].y + (targetY - hand[4].y) * pinchAmount;

    hand[8].x = hand[8].x + (targetX - hand[8].x) * pinchAmount;
    hand[8].y = hand[8].y + (targetY - hand[8].y) * pinchAmount;

    return hand;
  }

  /**
   * Applies 3D rotation (yaw, pitch, roll) around hand center.
   */
  static rotateHand(landmarks: Landmark3D[], yawRad = 0, pitchRad = 0, rollRad = 0): Landmark3D[] {
    const center = landmarks[0]; // Wrist as pivot
    return landmarks.map(lm => {
      let dx = lm.x - center.x;
      let dy = lm.y - center.y;
      let dz = (lm.z || 0) - (center.z || 0);

      // 1. Pitch (rotation around X axis)
      if (pitchRad !== 0) {
        const cosP = Math.cos(pitchRad);
        const sinP = Math.sin(pitchRad);
        const yNew = dy * cosP - dz * sinP;
        const zNew = dy * sinP + dz * cosP;
        dy = yNew;
        dz = zNew;
      }

      // 2. Yaw (rotation around Y axis)
      if (yawRad !== 0) {
        const cosY = Math.cos(yawRad);
        const sinY = Math.sin(yawRad);
        const xNew = dx * cosY + dz * sinY;
        const zNew = -dx * sinY + dz * cosY;
        dx = xNew;
        dz = zNew;
      }

      // 3. Roll (rotation around Z axis)
      if (rollRad !== 0) {
        const cosR = Math.cos(rollRad);
        const sinR = Math.sin(rollRad);
        const xNew = dx * cosR - dy * sinR;
        const yNew = dx * sinR + dy * cosR;
        dx = xNew;
        dy = yNew;
      }

      return {
        x: center.x + dx,
        y: center.y + dy,
        z: center.z + dz
      };
    });
  }

  /**
   * Generates a 12-frame sliding window swipe sequence.
   */
  static createSwipeSequence(direction: 'left' | 'right', frames = 12, speed = 0.05): Landmark3D[][] {
    const sequence: Landmark3D[][] = [];
    const dirSign = direction === 'right' ? 1 : -1;
    const startX = direction === 'right' ? 0.2 : 0.8;

    for (let i = 0; i < frames; i++) {
      const posX = startX + dirSign * (i * speed);
      const hand = SyntheticGestureSimulator.createOpenHand({ x: posX, y: 0.5, z: 0.0 });
      sequence.push(hand);
    }
    return sequence;
  }

  /**
   * Computes scale-invariant gesture metrics from 21 landmarks.
   */
  static analyzeLandmarks(lm: Landmark3D[]): GestureMetrics {
    if (!lm || lm.length < 21) {
      return {
        openness: 0,
        pinchDistance: 1.0,
        palmScale: 0.1,
        yaw: 0,
        pitch: 0,
        roll: 0,
        fingerStates: [0, 0, 0, 0, 0],
        centroid: { x: 0, y: 0, z: 0 }
      };
    }

    const wrist = lm[0];
    const indexMcp = lm[5];
    const middleMcp = lm[9];
    const pinkyMcp = lm[17];
    const middleTip = lm[12];
    const thumbTip = lm[4];
    const indexTip = lm[8];

    // Palm Scale
    const palmWidth = Math.hypot(pinkyMcp.x - indexMcp.x, pinkyMcp.y - indexMcp.y, (pinkyMcp.z || 0) - (indexMcp.z || 0));
    const palmHeight = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y, (middleMcp.z || 0) - (wrist.z || 0));
    const palmScale = Math.max((palmWidth * 1.2 + palmHeight * 1.0) / 2.2, 0.035);

    // Roll Angle
    const dirX = -(middleMcp.x - wrist.x);
    const dirY = -(middleMcp.y - wrist.y);
    const roll = Math.atan2(dirX, -dirY);

    // Pitch Angle
    const deltaZKnuckle = (middleMcp.z || 0) - (wrist.z || 0);
    const deltaZTip = (middleTip.z || 0) - (wrist.z || 0);
    const avgDeltaZ = (deltaZKnuckle * 0.4 + deltaZTip * 0.6) / palmScale;
    const pitch = Math.max(-1.0, Math.min(1.0, -avgDeltaZ * 1.3));

    // Yaw Angle
    const yaw = Math.atan2((indexMcp.z || 0) - (pinkyMcp.z || 0), (indexMcp.x - pinkyMcp.x) || 0.001);

    // Finger Extension analysis
    const fingerDefs = [
      { tip: 4, pip: 3, mcp: 2, isThumb: true },
      { tip: 8, pip: 6, mcp: 5 },
      { tip: 12, pip: 10, mcp: 9 },
      { tip: 16, pip: 14, mcp: 13 },
      { tip: 20, pip: 18, mcp: 17 }
    ];

    let fingerExtSum = 0;
    const fingerScores: number[] = [];

    for (const def of fingerDefs) {
      const tipPt = lm[def.tip];
      const pipPt = lm[def.pip];
      const mcpPt = lm[def.mcp];

      if (def.isThumb) {
        const dTipPinky = Math.hypot(tipPt.x - pinkyMcp.x, tipPt.y - pinkyMcp.y, (tipPt.z || 0) - (pinkyMcp.z || 0));
        const dMcpPinky = Math.hypot(mcpPt.x - pinkyMcp.x, mcpPt.y - pinkyMcp.y, (mcpPt.z || 0) - (pinkyMcp.z || 0));
        const thumbRatio = (dTipPinky - dMcpPinky * 0.7) / (palmScale * 0.9);
        const score = Math.max(0.0, Math.min(1.0, (thumbRatio - 0.1) / 0.85));
        fingerScores.push(score);
        fingerExtSum += score;
      } else {
        const dTipWrist = Math.hypot(tipPt.x - wrist.x, tipPt.y - wrist.y, (tipPt.z || 0) - (wrist.z || 0));
        const dPipWrist = Math.hypot(pipPt.x - wrist.x, pipPt.y - wrist.y, (pipPt.z || 0) - (wrist.z || 0));
        const dMcpWrist = Math.hypot(mcpPt.x - wrist.x, mcpPt.y - wrist.y, (mcpPt.z || 0) - (wrist.z || 0));
        const extRatio = (dTipWrist - dMcpWrist) / (Math.max(dPipWrist - dMcpWrist, 0.01) * 1.65);
        const score = Math.max(0.0, Math.min(1.0, (extRatio - 0.15) / 0.75));
        fingerScores.push(score);
        fingerExtSum += score;
      }
    }

    const tips = [4, 8, 12, 16, 20];
    let totalTipDist = 0;
    for (const t of tips) {
      totalTipDist += Math.hypot(lm[t].x - wrist.x, lm[t].y - wrist.y, (lm[t].z || 0) - (wrist.z || 0));
    }
    const avgTipDist = totalTipDist / 5.0;
    const distRatio = avgTipDist / palmScale;
    const ratioScore = Math.max(0.0, Math.min(1.0, (distRatio - 0.88) / 0.87));
    const openness = Math.max(0.0, Math.min(1.0, (fingerExtSum / 5.0) * 0.6 + ratioScore * 0.4));

    // Pinch distance
    const rawPinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y, (thumbTip.z || 0) - (indexTip.z || 0));
    const pinchDistance = Math.max(0.0, Math.min(1.0, (rawPinchDist / palmScale - 0.15) / 0.85));

    // Centroid
    let cx = 0, cy = 0, cz = 0;
    for (const p of [0, 5, 9, 13, 17]) {
      cx += lm[p].x;
      cy += lm[p].y;
      cz += lm[p].z || 0;
    }

    return {
      openness,
      pinchDistance,
      palmScale,
      yaw,
      pitch,
      roll,
      fingerStates: fingerScores,
      centroid: { x: cx / 5, y: cy / 5, z: cz / 5 }
    };
  }
}

// ============================================================================
// 5. Spring-Damper Harmonic Oscillator Physics Simulator
// ============================================================================

export class SpringDamperSimulator {
  position = 0;
  velocity = 0;
  target = 0;
  stiffness: number; // k
  damping: number;   // c (for critical damping c = 2*sqrt(k*m) with m=1)

  constructor(stiffness = 100, damping = 20) {
    this.stiffness = stiffness;
    this.damping = damping;
  }

  setTarget(target: number) {
    this.target = target;
  }

  update(dt: number): number {
    // F = -k * (x - x_target) - c * v
    const clampedDt = Math.max(0.0001, Math.min(dt, 0.1));
    const force = -this.stiffness * (this.position - this.target) - this.damping * this.velocity;
    const acceleration = force; // m = 1
    this.velocity += acceleration * clampedDt;
    this.position += this.velocity * clampedDt;
    return this.position;
  }

  reset(position = 0) {
    this.position = position;
    this.velocity = 0;
    this.target = position;
  }
}

// ============================================================================
// 6. Test Environment Setup & Assertion Engine
// ============================================================================

export class MockDOMElement {
  tagName: string;
  id = '';
  className = '';
  classList = {
    classes: new Set<string>(),
    add: (cls: string) => this.classList.classes.add(cls),
    remove: (cls: string) => this.classList.classes.delete(cls),
    toggle: (cls: string, force?: boolean) => {
      if (force !== undefined) {
        if (force) this.classList.classes.add(cls);
        else this.classList.classes.delete(cls);
        return force;
      }
      if (this.classList.classes.has(cls)) {
        this.classList.classes.delete(cls);
        return false;
      } else {
        this.classList.classes.add(cls);
        return true;
      }
    },
    contains: (cls: string) => this.classList.classes.has(cls)
  };
  style: Record<string, string> = {};
  textContent = '';
  innerHTML = '';
  width = 800;
  height = 600;
  videoWidth = 640;
  videoHeight = 480;
  readyState = 4;
  srcObject: any = null;
  dataset: Record<string, string> = {};
  listeners: Map<string, Function[]> = new Map();
  children: MockDOMElement[] = [];
  ownerDocument: any = null;

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  addEventListener(event: string, handler: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: Function) {
    if (this.listeners.has(event)) {
      this.listeners.set(event, this.listeners.get(event)!.filter(h => h !== handler));
    }
  }

  dispatchEvent(event: any) {
    const type = event.type || event;
    const handlers = this.listeners.get(type) || [];
    for (const h of handlers) h(event);
  }

  appendChild(child: MockDOMElement) {
    this.children.push(child);
  }

  querySelector(selector: string): MockDOMElement | null {
    if (!selector) return null;
    const clean = selector.replace(/^[.#]/, '');
    for (const child of this.children) {
      if (child.id === clean || child.classList.contains(clean) || child.className.includes(clean)) {
        return child;
      }
      const sub = child.querySelector(selector);
      if (sub) return sub;
    }
    const el = new MockDOMElement('div');
    if (selector.startsWith('#')) el.id = clean;
    else if (selector.startsWith('.')) el.className = clean;
    return el;
  }

  querySelectorAll(selector: string): MockDOMElement[] {
    const results: MockDOMElement[] = [];
    const clean = selector.replace(/^[.#]/, '');
    for (const child of this.children) {
      if (child.id === clean || child.classList.contains(clean) || child.className.includes(clean)) {
        results.push(child);
      }
      results.push(...child.querySelectorAll(selector));
    }
    return results;
  }

  click(): void {
    this.dispatchEvent({ type: 'click' });
  }

  matches(selector: string): boolean {
    return false;
  }

  getContext(contextType: string, options?: any) {
    if (contextType === 'webgl2' || contextType === 'webgl') {
      return new MockWebGL2RenderingContext(this);
    }
    if (contextType === '2d') {
      return new MockCanvas2DContext(this);
    }
    return null;
  }

  captureStream(fps = 60): MockMediaStream {
    return new MockMediaStream([new MockMediaStreamTrack('video')]);
  }

  play() { return Promise.resolve(); }
  pause() {}
  requestVideoFrameCallback(cb: Function) {
    setTimeout(() => cb(Date.now()), 16);
  }
}

export class MockCanvas extends MockDOMElement {
  constructor(w = 800, h = 600) {
    super('canvas');
    this.width = w;
    this.height = h;
  }
}

export class MockCanvas2DContext {
  canvas: MockDOMElement;
  lineWidth = 1;
  strokeStyle = '#000';
  fillStyle = '#000';
  shadowColor = 'transparent';
  shadowBlur = 0;

  constructor(canvas: MockDOMElement) {
    this.canvas = canvas;
  }

  clearRect(x: number, y: number, w: number, h: number) {}
  beginPath() {}
  moveTo(x: number, y: number) {}
  lineTo(x: number, y: number) {}
  stroke() {}
  arc(x: number, y: number, r: number, sa: number, ea: number) {}
  fill() {}
  drawImage() {}
  fillText(text: string, x: number, y: number) {}
  measureText(text: string) { return { width: text.length * 8 }; }
}

export class MockDOMDocument {
  get defaultView(): any {
    return (globalThis as any).window;
  }
  elementsById: Map<string, MockDOMElement> = new Map();
  head = new MockDOMElement('head');
  body = new MockDOMElement('body');

  createElement(tagName: string): MockDOMElement {
    const el = new MockDOMElement(tagName);
    (el as any).ownerDocument = this;
    return el;
  }

  createElementNS(ns: string, tagName: string): MockDOMElement {
    const el = new MockDOMElement(tagName);
    (el as any).ownerDocument = this;
    return el;
  }

  getElementById(id: string): MockDOMElement | null {
    if (!this.elementsById.has(id)) {
      const el = new MockDOMElement('div');
      el.id = id;
      this.elementsById.set(id, el);
    }
    return this.elementsById.get(id) || null;
  }

  querySelector(selector: string): MockDOMElement | null {
    if (selector.startsWith('#')) {
      return this.getElementById(selector.slice(1));
    }
    const el = new MockDOMElement('div');
    el.className = selector.replace(/^\./, '');
    return el;
  }

  querySelectorAll(selector: string): MockDOMElement[] {
    if (selector.includes('finger-dot')) {
      return [new MockDOMElement('div'), new MockDOMElement('div'), new MockDOMElement('div'), new MockDOMElement('div'), new MockDOMElement('div')];
    }
    if (selector.includes('theme-btn')) {
      const b1 = new MockDOMElement('button');
      b1.dataset.theme = 'emerald';
      const b2 = new MockDOMElement('button');
      b2.dataset.theme = 'nebula';
      return [b1, b2];
    }
    return [];
  }
}

export function setupTestEnvironment() {
  const g = globalThis as any;
  const mockWindow = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1.0,
    addEventListener: (type: string, fn: Function) => {},
    removeEventListener: (type: string, fn: Function) => {},
    dispatchEvent: (ev: any) => {},
    performance: { now: () => Date.now() },
    requestAnimationFrame: (cb: Function) => setTimeout(() => cb(Date.now()), 16),
    cancelAnimationFrame: (id: any) => clearTimeout(id),
    localStorage: {
      storage: new Map<string, string>(),
      getItem(k: string) { return this.storage.get(k) || null; },
      setItem(k: string, v: string) { this.storage.set(k, String(v)); },
      removeItem(k: string) { this.storage.delete(k); }
    }
  };

  g.window = mockWindow;
  g.self = g;
  g.requestAnimationFrame = mockWindow.requestAnimationFrame;
  g.cancelAnimationFrame = mockWindow.cancelAnimationFrame;

  g.document = new MockDOMDocument();
  g.HTMLMediaElement = { HAVE_CURRENT_DATA: 2, HAVE_ENOUGH_DATA: 4 };

  const mockNavigator = {
    userAgent: 'HeadlessTestEngine/1.0',
    mediaDevices: {
      getUserMedia: async (constraints: any) => new MockMediaStream([
        new MockMediaStreamTrack('video'),
        new MockMediaStreamTrack('audio')
      ])
    }
  };

  try {
    Object.defineProperty(g, 'navigator', {
      value: mockNavigator,
      configurable: true,
      writable: true
    });
  } catch {
    if (g.navigator) {
      g.navigator.mediaDevices = mockNavigator.mediaDevices;
    }
  }

  g.AudioContext = MockAudioContext;
  g.MediaRecorder = MockMediaRecorder;
  g.requestAnimationFrame = (cb: Function) => setTimeout(() => cb(Date.now()), 16);
  g.cancelAnimationFrame = (id: any) => clearTimeout(id);
}

export function teardownTestEnvironment() {
  // Cleans up global test mocks if necessary
}

// ============================================================================
// 7. Assertion Functions
// ============================================================================

export interface Assertion {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toBeCloseTo(expected: number, precision?: number): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(item: any): void;
  toHaveLength(length: number): void;
  toThrow(expectedMessageOrRegex?: string | RegExp): void;
  not: Assertion;
}

export function expect(actual: any): Assertion {
  const assert = (inverted = false): Assertion => ({
    toBe(expected: any) {
      const match = Object.is(actual, expected);
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${JSON.stringify(actual)} ${inverted ? 'not to be' : 'to be'} ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: any) {
      const match = JSON.stringify(actual) === JSON.stringify(expected);
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${JSON.stringify(actual)} ${inverted ? 'not to equal' : 'to equal'} ${JSON.stringify(expected)}`);
      }
    },
    toBeCloseTo(expected: number, precision = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      const match = diff <= tolerance;
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${actual} ${inverted ? 'not to be close to' : 'to be close to'} ${expected} (diff: ${diff}, tol: ${tolerance})`);
      }
    },
    toBeGreaterThan(expected: number) {
      const match = actual > expected;
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${actual} ${inverted ? 'not to be >' : 'to be >'} ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      const match = actual >= expected;
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${actual} ${inverted ? 'not to be >=' : 'to be >='} ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      const match = actual < expected;
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${actual} ${inverted ? 'not to be <' : 'to be <'} ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      const match = actual <= expected;
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${actual} ${inverted ? 'not to be <=' : 'to be <='} ${expected}`);
      }
    },
    toBeDefined() {
      const match = actual !== undefined;
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${actual} ${inverted ? 'not to be defined' : 'to be defined'}`);
      }
    },
    toBeUndefined() {
      const match = actual === undefined;
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${actual} ${inverted ? 'to be defined' : 'to be undefined'}`);
      }
    },
    toBeNull() {
      const match = actual === null;
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${actual} ${inverted ? 'not to be null' : 'to be null'}`);
      }
    },
    toBeTruthy() {
      const match = Boolean(actual);
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${actual} ${inverted ? 'to be falsy' : 'to be truthy'}`);
      }
    },
    toBeFalsy() {
      const match = !Boolean(actual);
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected ${actual} ${inverted ? 'to be truthy' : 'to be falsy'}`);
      }
    },
    toContain(item: any) {
      let match = false;
      if (typeof actual === 'string') match = actual.includes(item);
      else if (Array.isArray(actual)) match = actual.includes(item);
      else if (actual instanceof Set || actual instanceof Map) match = actual.has(item);
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected container ${inverted ? 'not to contain' : 'to contain'} ${item}`);
      }
    },
    toHaveLength(length: number) {
      const actualLen = actual?.length;
      const match = actualLen === length;
      if (inverted ? match : !match) {
        throw new Error(`Assertion Failed: expected length ${actualLen} ${inverted ? 'not to equal' : 'to equal'} ${length}`);
      }
    },
    toThrow(expectedMessageOrRegex?: string | RegExp) {
      let threw = false;
      let errorThrown: any = null;
      try {
        if (typeof actual === 'function') actual();
      } catch (err: any) {
        threw = true;
        errorThrown = err;
      }
      if (!threw && !inverted) {
        throw new Error(`Assertion Failed: expected function to throw an error, but it did not`);
      }
      if (threw && inverted) {
        throw new Error(`Assertion Failed: expected function not to throw an error, but it threw: ${errorThrown?.message || errorThrown}`);
      }
      if (threw && !inverted && expectedMessageOrRegex) {
        const msg = errorThrown?.message || String(errorThrown);
        if (typeof expectedMessageOrRegex === 'string' && !msg.includes(expectedMessageOrRegex)) {
          throw new Error(`Assertion Failed: expected error message to contain "${expectedMessageOrRegex}", got "${msg}"`);
        }
        if (expectedMessageOrRegex instanceof RegExp && !expectedMessageOrRegex.test(msg)) {
          throw new Error(`Assertion Failed: expected error message to match ${expectedMessageOrRegex}, got "${msg}"`);
        }
      }
    },
    get not() {
      return assert(true);
    }
  });

  return assert(false);
}

// ============================================================================
// 8. Test Suite Lifecycle & Hierarchy Manager
// ============================================================================

export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeEachHooks: Array<() => void | Promise<void>>;
  afterEachHooks: Array<() => void | Promise<void>>;
}

let activeSuite: TestSuite | null = null;
export const registeredSuites: TestSuite[] = [];

export function describe(name: string, fn: () => void) {
  const suite: TestSuite = {
    name,
    tests: [],
    beforeEachHooks: [],
    afterEachHooks: []
  };
  registeredSuites.push(suite);
  activeSuite = suite;
  fn();
  activeSuite = null;
}

export function it(name: string, fn: () => void | Promise<void>) {
  if (!activeSuite) {
    const defaultSuite: TestSuite = {
      name: 'Default Suite',
      tests: [],
      beforeEachHooks: [],
      afterEachHooks: []
    };
    registeredSuites.push(defaultSuite);
    activeSuite = defaultSuite;
  }
  activeSuite.tests.push({ name, fn });
}

export function beforeEach(fn: () => void | Promise<void>) {
  if (activeSuite) {
    activeSuite.beforeEachHooks.push(fn);
  }
}

export function afterEach(fn: () => void | Promise<void>) {
  if (activeSuite) {
    activeSuite.afterEachHooks.push(fn);
  }
}
