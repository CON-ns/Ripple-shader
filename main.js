import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ripple from "./texture/ripple.png";
import me from "./texture/me.png";
import ocean from "./texture/ocean.jpg";
import grade from "./texture/grade.png";
import mv from "./texture/mv-profile.png";

let camera, scene, scene1, renderer, mesh;
let baseTexture;
const max = 100; //mesh描画数
let mouse = new THREE.Vector2(0, 0);
let prevMouse = new THREE.Vector2(0, 0); //動く前のカーソル座標
let currentWave = 0;
let meshes = [];

//サイズを定義
const sizes = {
  width:innerWidth,
  height:innerHeight,
};

init();

function init() {
  const canvas = document.getElementById("webgl-canvas");

  //シーンを定義
  scene = new THREE.Scene();

  //カメラを定義
  const frustumSize = sizes.height;
  const aspect = sizes.width / sizes.height;
  camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    -1000,
    1000
  );
  camera.position.set(0, 0, 2);
  scene.add(camera);

  //ripple画像の読み込み
  let rippleImg = new THREE.TextureLoader().load(ripple);

  const geometry = new THREE.PlaneGeometry(64, 64, 1, 1);//波紋を貼るplane

  for (let i = 0; i < max; i++) {
    let m = new THREE.MeshBasicMaterial({
      map: rippleImg,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });

    mesh = new THREE.Mesh(geometry, m);
    mesh.visible = false;
    mesh.rotation.z = 2 * Math.PI * Math.random(); // ???????????
    scene.add(mesh);
    meshes.push(mesh);
  }

  window.addEventListener("mousemove", function () {
    trackMousePos();
  });

  //----------------------------------------------------

  //レンダラーを定義
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true, //アンチエイリアスを適応
  });
  renderer.setSize(sizes.width, sizes.height); //サイズを指定
  renderer.setPixelRatio(window.devicePixelRatio); //アスペクト比を指定
  renderer.render(scene, camera);

  //リサイズ対応
  window.addEventListener("resize", onWindowResize);
}

//カーソル座標を取得してmeshのpositionにセット
function mouseEvents() {
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX - sizes.width / 2;
    mouse.y = sizes.height / 2 - e.clientY;
  });
  requestAnimationFrame(mouseEvents);
}
mouseEvents();

//波紋をリセットする
function setNewWave(x, y, index) {
  let me = meshes[index];
  me.visible = true;
  me.position.x = x;
  me.position.y = y;
  me.scale.x = me.scale.y = 0.2; //サイズの初期値
  me.material.opacity = 0.5; //opacity初期値を設定
}

function trackMousePos() {
  if (
    Math.abs(mouse.x - prevMouse.x) > 20 &&
    Math.abs(mouse.y - prevMouse.y) > 20
  ) {
    //nothing
  } else {
    setNewWave(mouse.x, mouse.y, currentWave);
    currentWave = (currentWave + 1) % max; //1〜maxまでmousemoveしたら増加する変数
  }
  prevMouse.x = mouse.x;
  prevMouse.y = mouse.y;
}

//オフスクリーンレンダリング用の処理
scene1 = new THREE.Scene();
baseTexture = new THREE.WebGLRenderTarget(sizes.width, sizes.height, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
});

const geometryFullScreen = new THREE.PlaneGeometry(
  sizes.width,
  sizes.height,
  1,
  1
);

function addObject() {
  const subMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      uDisplacement: { value: null },
      uTexture: { value: new THREE.TextureLoader().load(ocean) },//背景画像を設定
    },
    vertexShader: document.getElementById("v-shader").textContent,
    fragmentShader: document.getElementById("f-shader").textContent,
  });
  return subMaterial;
}
const subMaterial = addObject();
const quad = new THREE.Mesh(geometryFullScreen, subMaterial);
scene1.add(quad);

//リサイズ対応関数
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
//アニメーション用関数
function render() {
  renderer.setRenderTarget(baseTexture);
  renderer.render(scene, camera);
  subMaterial.uniforms.uDisplacement.value = baseTexture.texture; //画像情報をdisplacementに格納
  renderer.setRenderTarget(null);
  renderer.clear();
  renderer.render(scene1, camera);
  //meshes配列の中身全てを一つ一つ取り出してrotationをさせる
  meshes.forEach((mesh) => {
    if (mesh.visible) {
      mesh.rotation.z += 0.02;
      mesh.material.opacity *= 0.98; //徐々に消す
      mesh.scale.x = 0.982 * mesh.scale.x + 0.108; //波紋のサイズを調整(徐々に拡大する)
      // mesh.scale.x = 1.005 * mesh.scale.x;//徐々に大きくする??
      mesh.scale.y = mesh.scale.x;
      if (mesh.material.opacity < 0.002) {
        mesh.visible = false;
      }
    }
  });
  requestAnimationFrame(render);
}
render();
