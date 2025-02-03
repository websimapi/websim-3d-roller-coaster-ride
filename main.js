/* 
  Main script for the 3D roller coaster ride.
  We create a roller coaster track using a CatmullRomCurve3,
  generate a TubeGeometry to visualize the track,
  and animate the camera to follow the track as if riding it.
*/

// Helper function to get the next value mod 1
function mod1(value) {
  return value - Math.floor(value);
}

// Initialize scene, camera, and renderer.
const container = document.getElementById('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // light blue sky

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Set up camera: We'll animate the camera to follow along the track.
const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

// Add ambient light and directional light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

// Create the roller coaster track curve using CatmullRomCurve3 with custom control points
const points = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(10, 5, -5),
  new THREE.Vector3(20, 0, -10),
  new THREE.Vector3(30, -5, 0),
  new THREE.Vector3(40, 0, 10),
  new THREE.Vector3(30, 5, 20),
  new THREE.Vector3(20, 10, 10),
  new THREE.Vector3(10, 5, 0),
  new THREE.Vector3(0, 0, 0) // closing loop
];
const trackCurve = new THREE.CatmullRomCurve3(points, true); // closed loop

// Create the tube geometry for the roller coaster track
const tubularSegments = 200;
const trackRadius = 0.5;
const radialSegments = 16;
const closed = true;
const tubeGeometry = new THREE.TubeGeometry(trackCurve, tubularSegments, trackRadius, radialSegments, closed);

const trackMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xff0000,
  roughness: 0.5,
  metalness: 0.1 
});
const trackMesh = new THREE.Mesh(tubeGeometry, trackMaterial);
scene.add(trackMesh);

// Optional: add supports as simple cylinders along the track (for extra realism)
function addSupport(position, length) {
  const supportGeometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
  const supportMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const supportMesh = new THREE.Mesh(supportGeometry, supportMaterial);
  supportMesh.position.copy(position);
  // Adjust so that the cylinder extends downward
  supportMesh.position.y -= length / 2;
  scene.add(supportMesh);
}

// We sample some positions along the track for supports
for (let i = 0; i < tubularSegments; i += 20) {
  const t = i / tubularSegments;
  const pos = trackCurve.getPointAt(t);
  // Ensure supports reach down to near ground level (y= -5)
  const supportLength = pos.y - (-5);
  addSupport(pos, supportLength);
}

// Add a simple ground plane for context
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // forest green
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = - Math.PI / 2;
groundMesh.position.y = -5;
scene.add(groundMesh);

// Variables for the camera along the track animation
let t = 0;
const speed = 0.0005; // Adjust this value for coaster speed

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update parameter t along the track. Loop back upon completing a circuit.
  t = mod1(t + speed);

  // Position the camera on the track
  const cameraPos = trackCurve.getPointAt(t);
  camera.position.copy(cameraPos);

  // For a smoother look, determine the next point along the track
  const lookAheadT = mod1(t + 0.01);
  const lookAtPoint = trackCurve.getPointAt(lookAheadT);
  camera.lookAt(lookAtPoint);

  // Optional: add a slight banking effect based on the curve's derivative
  const tangent = trackCurve.getTangentAt(t).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const axis = new THREE.Vector3().crossVectors(up, tangent).normalize();
  const angle = Math.acos(up.dot(tangent));
  camera.up.copy(up).applyAxisAngle(axis, angle * 0.2); // adjust banking effect

  renderer.render(scene, camera);
}

// Resize listener for mobile responsiveness
function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

window.addEventListener('resize', onWindowResize, false);

// Start the animation
animate();