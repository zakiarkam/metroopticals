import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OCCLUDER, PLACEMENT, TRYON_RUNTIME } from "@/features/try-on/config";
import { FACE_LANDMARK_COUNT, type FaceMetrics } from "./measure";
import type { FacePose } from "./tracker";

/**
 * The 3D tier. A real-scale GLB of the frame is rendered at the tracked
 * head pose, and  the part that makes it look worn rather than pasted on 
 * the customer's own face mesh plus a head-shaped ellipsoid are written to
 * the depth buffer without colour, so the temple arms are hidden where they
 * pass behind the cheek and ear.
 *
 * Coordinates: the scene is the video's pixel grid with an orthographic
 * camera, origin at the centre, Y up, Z towards the viewer. The tracker's
 * rotation has the same handedness and applies directly.
 *
 * Model convention: metres; origin at the centre of the bridge on the rear
 * plane of the front; the front faces +Z and the temples run towards −Z;
 * a material named "lens" is tintable; nodes named hinge_left / hinge_right
 * are splayed to the wearer's head width.
 */

type RenderOptions = {
  frameWidthMm: number | null;
  templeLengthMm: number | null;
};

const DEG = Math.PI / 180;

const depthOnly = () =>
  new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });

export class Scene3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private loader: GLTFLoader;
  private draco: DRACOLoader;
  private ktx2: KTX2Loader;
  private environment: THREE.Texture;

  private glasses: THREE.Group | null = null;
  private glassesWidthM = 0;
  private hinges: { left: THREE.Object3D | null; right: THREE.Object3D | null } = {
    left: null,
    right: null,
  };
  private lensMaterials: THREE.MeshPhysicalMaterial[] = [];

  private faceGeometry: THREE.BufferGeometry;
  private facePositions: Float32Array;
  private faceMesh: THREE.Mesh;
  private headGroup = new THREE.Group();
  private head: THREE.Mesh;
  private occluderEnabled = true;

  private size = { width: 0, height: 0 };
  private tmpMatrix = new THREE.Matrix4();
  private tmpQuat = new THREE.Quaternion();
  private tmpVec = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, triangles: number[]) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      // The snapshot reads this canvas back after the frame is drawn.
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
    this.camera.position.z = 0;

    // A neutral room gives acetate its sheen and metal its highlights without
    // shipping an HDR image.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.environment;

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(0.4, 1, 2);
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.5));

    // The customer's own face, as an invisible depth surface.
    this.facePositions = new Float32Array(FACE_LANDMARK_COUNT * 3);
    this.faceGeometry = new THREE.BufferGeometry();
    this.faceGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.facePositions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.faceGeometry.setIndex(triangles);
    this.faceMesh = new THREE.Mesh(this.faceGeometry, depthOnly());
    this.faceMesh.frustumCulled = false;
    this.faceMesh.renderOrder = 0;
    this.scene.add(this.faceMesh);

    // The rest of the head, behind the face mesh, so temple tips vanish
    // behind the ears rather than floating over them.
    this.head = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), depthOnly());
    this.head.renderOrder = 0;
    this.headGroup.add(this.head);
    this.scene.add(this.headGroup);

    this.draco = new DRACOLoader().setDecoderPath(TRYON_RUNTIME.draco);
    this.ktx2 = new KTX2Loader()
      .setTranscoderPath(TRYON_RUNTIME.basis)
      .detectSupport(this.renderer);
    this.loader = new GLTFLoader()
      .setDRACOLoader(this.draco)
      .setKTX2Loader(this.ktx2);
  }

  resize(width: number, height: number) {
    if (this.size.width === width && this.size.height === height) return;
    this.size = { width, height };
    this.renderer.setSize(width, height, false);
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
  }

  /** Loads a frame model, replacing any previous one. Resolves with its width. */
  async loadModel(url: string): Promise<{ widthMm: number }> {
    const gltf = await this.loader.loadAsync(url);
    this.disposeGlasses();

    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    this.glassesWidthM = size.x || 0.14;

    this.lensMaterials = [];
    this.hinges = { left: null, right: null };
    model.traverse((node) => {
      const name = node.name.toLowerCase();
      if (/hinge[_.\- ]?(l|left)\b/.test(name)) this.hinges.left = node;
      else if (/hinge[_.\- ]?(r|right)\b/.test(name)) this.hinges.right = node;

      if (!(node instanceof THREE.Mesh)) return;
      node.renderOrder = 1;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      node.material = materials.map((material: THREE.Material) => {
        if (!/lens/i.test(material.name)) return material;
        // Lenses are a thin transparent surface with a hard highlight. Real
        // refraction would sample a scene that is not there  the video sits
        // under the canvas  so plain opacity is the honest choice.
        const lens = new THREE.MeshPhysicalMaterial({
          name: material.name,
          color: 0xffffff,
          transparent: true,
          opacity: 0.16,
          roughness: 0.04,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          envMapIntensity: 1.2,
          depthWrite: false,
        });
        this.lensMaterials.push(lens);
        material.dispose();
        return lens;
      });
      if (node.material.length === 1) node.material = node.material[0];
    });

    this.glasses = new THREE.Group();
    this.glasses.add(model);
    this.glasses.visible = false;
    this.scene.add(this.glasses);

    return { widthMm: this.glassesWidthM * 1000 };
  }

  /** Sun tint: a colour and how dark. Null restores clear lenses. */
  setLensTint(hex: string | null, opacity: number = 0.7) {
    for (const lens of this.lensMaterials) {
      if (hex) {
        lens.color.set(hex);
        lens.opacity = opacity;
      } else {
        lens.color.set(0xffffff);
        lens.opacity = 0.16;
      }
      lens.needsUpdate = true;
    }
  }

  setOccluder(enabled: boolean) {
    this.occluderEnabled = enabled;
  }

  render(pose: FacePose, metrics: FaceMetrics, options: RenderOptions) {
    if (!this.glasses || !this.size.width) return;
    const { width, height } = this.size;
    const toScene = (p: { x: number; y: number; z: number }, out: THREE.Vector3) =>
      out.set(p.x - width / 2, height / 2 - p.y, -p.z);

    // Head rotation, straight from the tracker when it gave a matrix.
    if (pose.rotationMatrix) {
      const r = pose.rotationMatrix;
      this.tmpMatrix.set(
        r[0], r[3], r[6], 0,
        r[1], r[4], r[7], 0,
        r[2], r[5], r[8], 0,
        0, 0, 0, 1,
      );
      this.tmpQuat.setFromRotationMatrix(this.tmpMatrix);
    } else {
      const { yaw, pitch, roll } = metrics.rotation;
      this.tmpQuat.setFromEuler(new THREE.Euler(pitch, yaw, -roll, "YXZ"));
    }

    // Occluders follow the face.
    this.faceMesh.visible = this.occluderEnabled;
    this.headGroup.visible = this.occluderEnabled;
    if (this.occluderEnabled) {
      const positions = this.facePositions;
      const recess = OCCLUDER.faceRecessMm * metrics.pxPerMm;
      for (let i = 0; i < FACE_LANDMARK_COUNT; i += 1) {
        toScene(pose.landmarks[i], this.tmpVec);
        positions[i * 3] = this.tmpVec.x;
        positions[i * 3 + 1] = this.tmpVec.y;
        positions[i * 3 + 2] = this.tmpVec.z - recess;
      }
      (this.faceGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      const fw = metrics.faceWidthPx;
      toScene(metrics.centre, this.headGroup.position);
      this.headGroup.quaternion.copy(this.tmpQuat);
      this.head.position.set(0, OCCLUDER.centreUp * fw, -OCCLUDER.centreBack * fw);
      this.head.scale.set(OCCLUDER.radiusX * fw, OCCLUDER.radiusY * fw, OCCLUDER.radiusZ * fw);
    }

    // The frame: real width in pixels, sitting a little below the pupils.
    const correction =
      options.frameWidthMm && this.glassesWidthM
        ? options.frameWidthMm / 1000 / this.glassesWidthM
        : 1;
    const scale = metrics.pxPerMm * 1000 * correction;

    toScene(metrics.anchor, this.glasses.position);
    // Down a little and forward to the vertex distance, in the head's own frame.
    this.tmpVec
      .set(
        0,
        -PLACEMENT.verticalOffsetMm * metrics.pxPerMm,
        PLACEMENT.forwardOffsetMm * metrics.pxPerMm,
      )
      .applyQuaternion(this.tmpQuat);
    this.glasses.position.add(this.tmpVec);
    this.glasses.quaternion.copy(this.tmpQuat);
    this.glasses.scale.setScalar(scale);
    this.glasses.visible = true;

    // Arms open a touch wider on a wide head, narrower on a narrow one.
    if (options.frameWidthMm && options.templeLengthMm) {
      const gap = (metrics.faceWidthMm - options.frameWidthMm) / 2;
      const splay = THREE.MathUtils.clamp(
        Math.atan2(gap, options.templeLengthMm),
        -PLACEMENT.maxSplayDeg * DEG,
        PLACEMENT.maxSplayDeg * DEG,
      );
      if (this.hinges.right) this.hinges.right.rotation.y = splay;
      if (this.hinges.left) this.hinges.left.rotation.y = -splay;
    }

    this.renderer.render(this.scene, this.camera);
  }

  clear() {
    if (this.glasses) this.glasses.visible = false;
    this.renderer.clear();
  }

  private disposeGlasses() {
    if (!this.glasses) return;
    this.scene.remove(this.glasses);
    this.glasses.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry?.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
    });
    this.glasses = null;
    this.lensMaterials = [];
    this.hinges = { left: null, right: null };
  }

  dispose() {
    this.disposeGlasses();
    this.faceGeometry.dispose();
    (this.faceMesh.material as THREE.Material).dispose();
    this.head.geometry.dispose();
    (this.head.material as THREE.Material).dispose();
    this.environment.dispose();
    this.draco.dispose();
    this.ktx2.dispose();
    this.renderer.dispose();
  }
}
