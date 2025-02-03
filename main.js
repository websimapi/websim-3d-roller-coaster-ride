// Import Three.js as an ES module from CDN (using version r128)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
// Import cannon-es physics (using ES module import from skypack CDN)
import * as CANNON from 'https://cdn.skypack.dev/cannon-es';

// Helper function to get the next value mod 1
function mod1(value) {
  return value - Math.floor(value);
}

// Set up Three.js basics
const container = document.getElementById('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // light blue sky

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Set up camera; it will follow the roller coaster cart.
const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
const cameraYOffset = 2; // camera height offset

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

/* 
  Create a gentle roller coaster track using a CatmullRomCurve3.
  The control points have been adjusted to avoid super-sharp turns.
*/
const points = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(10, 1, -5),
  new THREE.Vector3(20, 0, -8),
  new THREE.Vector3(30, 0.5, -4),
  new THREE.Vector3(40, 0, 2),
  new THREE.Vector3(35, 0.5, 10),
  new THREE.Vector3(25, 1, 8),
  new THREE.Vector3(15, 0.5, 0),
  new THREE.Vector3(0, 0, 0) // closing loop
];
const trackCurve = new THREE.CatmullRomCurve3(points, true); // closed loop
const tubularSegments = 400;

// Instead of a round tube, we create a flat wooden track by extruding a rectangular shape along the curve.
const trackWidth = 2;      // overall width of the wooden board
const trackThickness = 0.1; // thin flat profile

const trackShape = new THREE.Shape();
trackShape.moveTo(-trackWidth/2, -trackThickness/2);
trackShape.lineTo(trackWidth/2, -trackThickness/2);
trackShape.lineTo(trackWidth/2, trackThickness/2);
trackShape.lineTo(-trackWidth/2, trackThickness/2);
trackShape.lineTo(-trackWidth/2, -trackThickness/2);

const extrudeSettings = {
  steps: tubularSegments,
  extrudePath: trackCurve,
  bevelEnabled: false
};
const trackGeometry = new THREE.ExtrudeGeometry(trackShape, extrudeSettings);

// Wood-like material for the track
const trackMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x8B4513, // saddle brown for wood flavor
  roughness: 0.9,
  metalness: 0.0 
});
const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
scene.add(trackMesh);

/* 
  Add wooden ties along the track.
  They support the flat board design.
*/
function addTie(tVal) {
  const pos = trackCurve.getPointAt(tVal);
  const tangent = trackCurve.getTangentAt(tVal).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  let side = new THREE.Vector3().crossVectors(up, tangent);
  if (side.lengthSq() < 0.0001) {
    side = new THREE.Vector3(1, 0, 0);
  }
  side.normalize();

  const tieWidth = trackWidth * 1.2;
  const tieHeight = 0.15;
  const tieDepth = 0.05;
  const geometry = new THREE.BoxGeometry(tieWidth, tieHeight, tieDepth);
  const material = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });
  const tieMesh = new THREE.Mesh(geometry, material);

  tieMesh.position.copy(pos);
  tieMesh.position.y -= trackThickness; // position tie slightly underneath
  // Orient tie so its long side aligns with the side vector
  const matrix = new THREE.Matrix4();
  matrix.makeBasis(side, up, tangent);
  tieMesh.setRotationFromMatrix(matrix);

  scene.add(tieMesh);
}
for (let tVal = 0; tVal < 1; tVal += 0.05) {
  addTie(tVal);
}

/*
  Add wooden supports beneath the track.
  Twin posts on each side help visualize the construction.
*/
function addSupport(tVal) {
  const pos = trackCurve.getPointAt(tVal);
  const tangent = trackCurve.getTangentAt(tVal).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  let side = new THREE.Vector3().crossVectors(up, tangent);
  if (side.lengthSq() < 0.0001) {
    side = new THREE.Vector3(1, 0, 0);
  }
  side.normalize();

  const groundLevel = -5;
  const supportHeight = pos.y - groundLevel;
  if (supportHeight <= 0.5) return;

  const postWidth = 0.2;
  const postDepth = 0.2;
  const geometry = new THREE.BoxGeometry(postWidth, supportHeight, postDepth);
  const material = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });
  
  const leftPost = new THREE.Mesh(geometry, material);
  leftPost.position.copy(pos).add(side.clone().multiplyScalar(trackWidth/2 + postWidth));
  leftPost.position.y = (pos.y + groundLevel) / 2;
  scene.add(leftPost);
  
  const rightPost = new THREE.Mesh(geometry, material);
  rightPost.position.copy(pos).add(side.clone().multiplyScalar(- (trackWidth/2 + postWidth)));
  rightPost.position.y = (pos.y + groundLevel) / 2;
  scene.add(rightPost);
}
for (let i = 0; i < tubularSegments; i += 20) {
  const tSample = i / tubularSegments;
  addSupport(tSample);
}

// Ground plane for context
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -5;
scene.add(groundMesh);

/*
  Physics-based cart and chain lift mechanics.
  The chain lift pulls the cart along a gentle section of the track,
  after which the cart is released to ride under physics simulation.
*/

// Physics world setup
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
const fixedTimeStep = 1/60;

// Chain lift parameters
const chainLiftEnd = 0.2; // The chain lift covers the track from t = 0 to t = 0.2
let cartT = 0;          // Parameter along the track for the cart while on chain
const chainLiftSpeed = 0.0005; // Speed along track for chain lift

let cartReleased = false;   // flag to indicate cart release
let cartPhysicsBody = null; // Will hold the physics body after release

// Create a visual cart mesh (a simple box)
const cartWidth = 1;
const cartHeight = 0.5;
const cartDepth = 1;
const cartGeometry = new THREE.BoxGeometry(cartWidth, cartHeight, cartDepth);
const cartMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // red cart
const cartMesh = new THREE.Mesh(cartGeometry, cartMaterial);
scene.add(cartMesh);

// Create chain links for the chain lift mechanism.
const chainGroup = new THREE.Group();
const numChainLinks = 10;
const chainLinks = [];
for (let i = 0; i < numChainLinks; i++) {
  const linkGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.05);
  const linkMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const linkMesh = new THREE.Mesh(linkGeometry, linkMaterial);
  // Each link has an offset parameter to space them out along the chain.
  linkMesh.userData.phase = i / numChainLinks;
  chainGroup.add(linkMesh);
  chainLinks.push(linkMesh);
}
scene.add(chainGroup);

// Animation loop variables
let lastTime;
function animate(time) {
  requestAnimationFrame(animate);
  if (!lastTime) lastTime = time;
  const dt = (time - lastTime) / 1000;
  lastTime = time;
  
  // Animate chain links (cycling along the chain-lift section)
  chainLinks.forEach(link => {
    // Calculate the phase parameter for each link (cycling between 0 and chainLiftEnd)
    let phase = mod1(link.userData.phase + chainLiftSpeed * time * 0.05);
    // Position the link along the track's chain lift segment
    const pos = trackCurve.getPointAt(phase * chainLiftEnd);
    // Offset the chain link slightly to the side (using tangent and side vector)
    const tangent = trackCurve.getTangentAt(phase * chainLiftEnd).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    let side = new THREE.Vector3().crossVectors(up, tangent);
    if (side.lengthSq() < 0.0001) side = new THREE.Vector3(1, 0, 0);
    side.normalize();
    // Position the link a bit below the track
    pos.add(side.clone().multiplyScalar(-0.5));
    pos.y -= 0.2;
    link.position.copy(pos);
  });
  
  // Update cart movement
  if (!cartReleased) {
    // While on chain lift, move the cart along the track gently.
    cartT += chainLiftSpeed * dt * 60; // adjust speed with frame time
    if (cartT >= chainLiftEnd) {
      // Release the cart into physics; initialize physics body at current cart position.
      cartT = chainLiftEnd;
      cartReleased = true;
      const cartPos = trackCurve.getPointAt(cartT);
      const cartTangent = trackCurve.getTangentAt(cartT).normalize();
      // Create a corresponding Cannon body for the cart.
      const shape = new CANNON.Box(new CANNON.Vec3(cartWidth/2, cartHeight/2, cartDepth/2));
      cartPhysicsBody = new CANNON.Body({ mass: 1 });
      cartPhysicsBody.addShape(shape);
      cartPhysicsBody.position.set(cartPos.x, cartPos.y, cartPos.z);
      // Give an initial velocity along the track tangent.
      cartPhysicsBody.velocity.set(
        cartTangent.x * 2,
        cartTangent.y * 2,
        cartTangent.z * 2
      );
      world.addBody(cartPhysicsBody);
    } else {
      // Move cart along the chain-lift portion of the track.
      const pos = trackCurve.getPointAt(cartT);
      cartMesh.position.copy(pos);
      // For a smooth ride, look ahead along the curve.
      let lookAhead = mod1(cartT + 0.01);
      const lookPos = trackCurve.getPointAt(lookAhead);
      cartMesh.lookAt(lookPos);
    }
  } else {
    // After release, update the physics world and sync cartMesh with physics body.
    world.step(fixedTimeStep, dt);
    cartMesh.position.set(
      cartPhysicsBody.position.x,
      cartPhysicsBody.position.y,
      cartPhysicsBody.position.z
    );
    // Set the cart's orientation to align with its velocity (if significant)
    const velocity = cartPhysicsBody.velocity;
    const speed = velocity.length();
    if (speed > 0.1) {
      const dir = new THREE.Vector3(velocity.x, velocity.y, velocity.z).normalize();
      const currentPos = cartMesh.position.clone();
      const lookPos = currentPos.clone().add(dir);
      cartMesh.lookAt(lookPos);
    }
  }
  
  // Update camera to follow the cart.
  const camTarget = cartMesh.position.clone();
  camera.position.lerp(new THREE.Vector3(
    camTarget.x,
    camTarget.y + cameraYOffset,
    camTarget.z
  ), 0.05);
  // For look direction, if physics is active use velocity direction; else follow track curve.
  let lookDirection;
  if (cartReleased && cartPhysicsBody.velocity.length() > 0.1) {
    lookDirection = new THREE.Vector3(
      cartPhysicsBody.velocity.x,
      cartPhysicsBody.velocity.y,
      cartPhysicsBody.velocity.z
    ).normalize();
  } else {
    const lookAheadT = mod1(cartT + 0.01);
    const lookPos = trackCurve.getPointAt(lookAheadT);
    lookDirection = lookPos.clone().sub(cartMesh.position).normalize();
  }
  camera.lookAt(cartMesh.position.clone().add(lookDirection));
  
  renderer.render(scene, camera);
}
animate();

// Adjust rendering on window resize for mobile responsiveness.
function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}
window.addEventListener('resize', onWindowResize, false);