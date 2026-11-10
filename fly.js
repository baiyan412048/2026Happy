// 3D 飛機飛越天空 + 飛機雲（網址加 &fly 啟用）
// 飛機模型：A320（無標誌版），amvlab/aircraft-models，CC BY 4.0
//   https://github.com/amvlab/aircraft-models
// 3D 引擎：three.js r160（MIT）
import * as THREE from "three";
import { GLTFLoader } from "./vendor/three/examples/jsm/loaders/GLTFLoader.js";

// ===== 可調整的參數 =====
const CFG = {
  firstDelay: 1.2,     // 頁面開啟後幾秒開始第一趟（秒）
  speed: 30,           // 飛行速度（世界單位/秒）；手機上飛越畫面約 9 秒
  gap: 12,             // 飛出畫面到下一趟的間隔（秒），讓飛機雲慢慢散去
  trailLife: 11,       // 飛機雲存在多久（秒）
  wind: -1.6,          // 飛機雲隨風往左飄的速度（世界單位/秒）
};

// 鏡頭在原點看向天空（仰角自動調整，見 aimCamera）。
// 航線：從左邊遠處進場（畫面左側約 36% 高度），往右邊近處飛來並爬升約 9°，
// 在右上方出場；飛機會越飛越大（以直式手機計算，寬螢幕會自動把航線延長到畫面外）。
const CAMERA = { fov: 34 };
const PATH = { a: [-128, 111, -388], b: [83, 154, -241] };

export function start(sky, theme) {
  const canvas = document.createElement("canvas");
  canvas.className = "fly-layer";
  // 放在雲層之上、lofi 顆粒之下
  sky.insertBefore(canvas, document.getElementById("grain"));

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 1, 4000);

  // 光線：天空的柔光 + 左上方的陽光（粉色主題帶一點暖粉）
  const pink = theme === "pink";
  scene.add(new THREE.HemisphereLight(pink ? 0xfff0f4 : 0xf2f6fa, pink ? 0xc9a3b6 : 0x9fb3c2, 2.2));
  const sun = new THREE.DirectionalLight(pink ? 0xffe9e0 : 0xfff6e8, 2.4);
  sun.position.set(-60, 120, 80);
  scene.add(sun);

  // ===== 航線 =====
  const A = new THREE.Vector3(...PATH.a), B = new THREE.Vector3(...PATH.b);
  const dir = B.clone().sub(A).normalize();
  const from = new THREE.Vector3(), to = new THREE.Vector3();
  let flight = 9;
  const tmp = new THREE.Vector3();

  // 沿著航線（可延長）找出飛機剛好在畫面外的進場點與出場點
  function fitPath() {
    camera.updateMatrixWorld();
    const L = A.distanceTo(B);
    // 投影到畫面：x、y 都在 -1～+1 之間代表在畫面內；超出 1.35 視為完全離開畫面
    const inside = (k) => {
      const v = tmp.copy(A).addScaledVector(dir, k * L).project(camera);
      return Math.abs(v.x) < 1.35 && Math.abs(v.y) < 1.35;
    };
    let k0 = 0, k1 = 1;
    while (inside(k0) && k0 > -4) k0 -= .02;
    while (inside(k1) && k1 < 5) k1 += .02;
    from.copy(A).addScaledVector(dir, k0 * L);
    to.copy(A).addScaledVector(dir, k1 * L);
    // 寬螢幕航線較長：飛行時間限制在 8～11 秒
    flight = THREE.MathUtils.clamp(from.distanceTo(to) / CFG.speed, 8, 11);
  }

  // 調整鏡頭仰角：直式螢幕讓航線中段在畫面上方約 20% 高度；
  // 寬螢幕水平視野較廣，中段放低到約 35%，飛機才會橫越大半個畫面再爬出去
  const mid = A.clone().add(B).multiplyScalar(.5);
  function aimCamera() {
    const target = camera.aspect < .8 ? .6 : .3;    // 畫面座標：+1 頂端、-1 底部
    let lo = -20, hi = 45;
    for (let i = 0; i < 30; i++) {
      const deg = (lo + hi) / 2, r = THREE.MathUtils.degToRad(deg);
      camera.lookAt(0, Math.sin(r), -Math.cos(r));
      camera.updateMatrixWorld();
      const y = tmp.copy(mid).project(camera).y;   // +1 頂端、-1 底部
      if (y > target) lo = deg; else hi = deg;      // 太高就把鏡頭往上抬
    }
  }

  // 尺寸只在背景層真的改變時才重設（Safari 工具列伸縮不會觸發）
  let lastW = 0, lastH = 0;
  function resize() {
    const w = sky.clientWidth || innerWidth, h = sky.clientHeight || innerHeight;
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 直式螢幕較窄：拉遠視角
    camera.fov = w / h < .8 ? CAMERA.fov * 1.55 : CAMERA.fov;
    camera.updateProjectionMatrix();
    aimCamera();
    fitPath();
  }
  resize();
  addEventListener("resize", resize);

  // ===== 飛機雲：柔邊粒子，從兩具引擎後方噴出，慢慢擴散、飄走、淡出 =====
  const MAX = 6000;
  const pos = new Float32Array(MAX * 3);
  const birth = new Float32Array(MAX).fill(-1e6);
  const seed = new Float32Array(MAX);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("birth", new THREE.BufferAttribute(birth, 1));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const trailMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uLife: { value: CFG.trailLife }, uWind: { value: CFG.wind },
      uScale: { value: 1 }, uColor: { value: new THREE.Color(pink ? 0xfff4f7 : 0xffffff) }
    },
    vertexShader: `
      attribute float birth; attribute float seed;
      uniform float uTime, uLife, uWind, uScale;
      varying float vAlpha;
      void main() {
        float age = uTime - birth;
        vec3 p = position;
        p.x += uWind * age;                                  // 隨風飄
        p.y += (seed - .5) * .12 * age;                      // 慢慢上下散開
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float size = 2.2 + age * 1.1;                        // 越久越擴散
        gl_PointSize = size * uScale / -mv.z;
        // 剛噴出時看不見（真實飛機雲會在機後一小段才形成），之後慢慢淡出
        vAlpha = (age < 0. || age > uLife) ? 0. :
                 smoothstep(.15, .9, age) * (1. - smoothstep(uLife * .35, uLife, age)) * .32;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - .5) * 2.;
        float a = vAlpha * smoothstep(1., .2, d);
        if (a < .004) discard;
        gl_FragColor = vec4(uColor, a);
      }`
  });
  const trail = new THREE.Points(geo, trailMat);
  trail.frustumCulled = false;
  scene.add(trail);
  let head = 0;
  function emit(worldPos, t) {
    const i = head; head = (head + 1) % MAX;
    pos[i * 3] = worldPos.x + (Math.random() - .5) * .6;
    pos[i * 3 + 1] = worldPos.y + (Math.random() - .5) * .6;
    pos[i * 3 + 2] = worldPos.z + (Math.random() - .5) * .6;
    birth[i] = t; seed[i] = Math.random();
  }

  // ===== 飛機 =====
  const plane = new THREE.Group();
  plane.visible = false;
  scene.add(plane);
  // 機頭對準航線方向（含爬升角），機翼保持水平
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0));
  plane.quaternion.setFromRotationMatrix(m);
  // lookAt 讓物件的 -Z 朝向目標；模型機頭在 +X，所以再繞 Y 轉 90°
  plane.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
  // 兩具引擎尾端的位置（模型座標，機頭朝 +X），換成世界座標的偏移
  const engines = [new THREE.Vector3(-4, -1.6, 5.8), new THREE.Vector3(-4, -1.6, -5.8)]
    .map((e) => e.applyQuaternion(plane.quaternion));

  new GLTFLoader().load("assets/models/a320.glb", (g) => plane.add(g.scene));

  // ===== 動畫 =====
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  let tripStart = CFG.firstDelay, lastEmit = -1;
  const at = (t) => (t - tripStart) / flight;  // 這一趟的進度 0→1

  function frame() {
    const t = window.__flyTime ?? clock.getElapsedTime();  // __flyTime 僅供測試
    trailMat.uniforms.uTime.value = t;
    trailMat.uniforms.uScale.value = renderer.domElement.height * .9;

    if (at(t) > 1 && t > tripStart + flight + CFG.gap) tripStart = t;   // 下一趟
    const k = at(t);
    if (k >= 0 && k <= 1 && plane.children.length) {
      plane.visible = true;
      plane.position.lerpVectors(from, to, k);
      // 依每顆粒子的發射時間算出飛機當時的位置，任何幀率下飛機雲都連續
      if (lastEmit < tripStart) lastEmit = Math.max(tripStart, t - .05);
      while (lastEmit < t) {
        lastEmit += 1 / 240;
        tmp.lerpVectors(from, to, Math.min(1, at(lastEmit)));
        engines.forEach((e) => emit(e.clone().add(tmp), lastEmit));
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.birth.needsUpdate = true;
      geo.attributes.seed.needsUpdate = true;
    } else {
      plane.visible = false;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  if (!reduce) requestAnimationFrame(frame);
  return { scene, camera, plane, renderer, get flight() { return flight; } };
}
