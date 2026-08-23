import * as THREE from 'three';
import { IScene, GestureState } from '../core/types';

/**
 * Camera rigging parameters for custom scene framing
 */
export interface CameraRigConfig {
  defaultPosition: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
}

/**
 * BaseScene: Abstract foundational class for all Interstellar WebGL scenes.
 * Implements IScene lifecycle, automatic resource tracking, camera rigging,
 * particle count monitoring, and safe GPU resource disposal.
 */
export abstract class BaseScene implements IScene {
  public abstract readonly name: string;
  public readonly scene: THREE.Scene;
  public camera?: THREE.PerspectiveCamera;

  protected _particleCount: number = 0;
  public isInitialized: boolean = false;
  public isActive: boolean = false;

  protected renderer: THREE.WebGLRenderer | null = null;
  protected parentCamera: THREE.PerspectiveCamera | null = null;
  protected disposables: Array<{ dispose: () => void } | THREE.Object3D> = [];

  // Default camera rigging profile
  public cameraRig: CameraRigConfig = {
    defaultPosition: new THREE.Vector3(0, 0, 100),
    targetLookAt: new THREE.Vector3(0, 0, 0),
    fov: 60,
    minDistance: 10,
    maxDistance: 800,
  };

  constructor() {
    this.scene = new THREE.Scene();
  }

  /**
   * Number of active GPU particles rendered in this scene
   */
  public get particleCount(): number {
    return this._particleCount;
  }

  /**
   * Initialize scene assets, shaders, geometries, and GPU buffers
   */
  public async init(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.renderer = renderer;
    this.parentCamera = camera;
    await this.setupScene(renderer, camera);
    this.isInitialized = true;
  }

  /**
   * Abstract setup hook implemented by specific cosmological scenes
   */
  protected abstract setupScene(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): Promise<void> | void;

  /**
   * Per-frame physics, shader uniforms, and particle dynamics update pass
   */
  public abstract update(delta: number, timeDilation: number, gestureState: GestureState): void;

  /**
   * Render pass for scene graph
   */
  public render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    const activeCam = this.camera ?? camera;
    renderer.render(this.scene, activeCam);
  }

  /**
   * Invoked when navigating into this scene
   */
  public onEnter(previousSceneName?: string): void {
    this.isActive = true;
  }

  /**
   * Invoked when navigating away from this scene
   */
  public onExit(nextSceneName?: string): void {
    this.isActive = false;
  }

  /**
   * Viewport resize notification
   */
  public resize(width: number, height: number, pixelRatio: number): void {
    if (this.camera) {
      this.camera.aspect = width / Math.max(1, height);
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Track disposable resources (geometries, materials, textures, buffers) for automated cleanup
   */
  protected registerDisposable<T extends { dispose: () => void } | THREE.Object3D>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  /**
   * Deep disposal of Object3D hierarchy and GPU resources
   */
  protected cleanObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => this.cleanMaterial(m));
        } else {
          this.cleanMaterial(mat);
        }
      }
    });
  }

  /**
   * Clean individual material uniforms, textures, and GPU programs
   */
  protected cleanMaterial(mat: THREE.Material): void {
    const shaderMat = mat as THREE.ShaderMaterial;
    if (shaderMat.uniforms) {
      for (const key of Object.keys(shaderMat.uniforms)) {
        const u = shaderMat.uniforms[key];
        if (u && u.value && typeof u.value.dispose === 'function') {
          u.value.dispose();
        }
      }
    }
    mat.dispose();
  }

  /**
   * Free all GPU memory, buffers, materials, textures, and scene nodes
   */
  public dispose(): void {
    for (const item of this.disposables) {
      if ('dispose' in item && typeof item.dispose === 'function') {
        try {
          item.dispose();
        } catch {
          // Ignore already disposed
        }
      }
      if (item instanceof THREE.Object3D) {
        this.cleanObject(item);
      }
    }
    this.disposables = [];

    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.cleanObject(child);
      this.scene.remove(child);
    }

    this.isInitialized = false;
    this.isActive = false;
    this.renderer = null;
    this.parentCamera = null;
  }
}
