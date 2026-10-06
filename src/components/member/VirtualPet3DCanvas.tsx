import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PetType, VirtualPetData } from '../../types';

interface VirtualPet3DCanvasProps {
  pet: VirtualPetData;
  actionTrigger?: 'idle' | 'eat' | 'wash' | 'pet' | 'sleep' | 'levelUp';
  onPetClick?: () => void;
}

export const VirtualPet3DCanvas: React.FC<VirtualPet3DCanvasProps> = ({
  pet,
  actionTrigger = 'idle',
  onPetClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.8, 4.8);
    camera.lookAt(0, 0.4, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    dirLight.position.set(3, 5, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.PointLight(0xd946ef, 1.2, 10);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    const bottomGlow = new THREE.PointLight(0x8b5cf6, 1.0, 8);
    bottomGlow.position.set(0, -1, 1);
    scene.add(bottomGlow);

    // 5. 3D Pedestal Stage
    const pedestalGroup = new THREE.Group();

    const stageGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.3, 32);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x1f163d,
      roughness: 0.3,
      metalness: 0.6,
    });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = -0.75;
    stage.receiveShadow = true;
    pedestalGroup.add(stage);

    const ringGeo = new THREE.TorusGeometry(1.65, 0.04, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.6;
    pedestalGroup.add(ring);

    scene.add(pedestalGroup);

    // 6. Character 3D Model Construction based on petType
    const petGroup = new THREE.Group();
    petGroup.position.y = -0.3;

    // Color palettes
    const palette = {
      cat: { main: 0xf59e0b, belly: 0xfef3c7, earInner: 0xf472b6, eye: 0x0f172a, nose: 0xf43f5e },
      fox: { main: 0xea580c, belly: 0xffedd5, earInner: 0x1e293b, eye: 0x0f172a, nose: 0x0f172a },
      panda: { main: 0xf8fafc, belly: 0x1e293b, earInner: 0x1e293b, eye: 0x0f172a, nose: 0x1e293b },
      bunny: { main: 0xf472b6, belly: 0xfdf2f8, earInner: 0xfb7185, eye: 0x831843, nose: 0xf43f5e },
      dragon: { main: 0xef4444, belly: 0xfef08a, earInner: 0x991b1b, eye: 0xfacc15, nose: 0x7f1d1d },
    }[pet.petType] || { main: 0xf59e0b, belly: 0xfef3c7, earInner: 0xf472b6, eye: 0x0f172a, nose: 0xf43f5e };

    const mainMat = new THREE.MeshStandardMaterial({ color: palette.main, roughness: 0.4, metalness: 0.1 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: palette.belly, roughness: 0.5 });
    const earInnerMat = new THREE.MeshStandardMaterial({ color: palette.earInner, roughness: 0.6 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: palette.eye, roughness: 0.1 });
    const noseMat = new THREE.MeshStandardMaterial({ color: palette.nose, roughness: 0.3 });
    const whiteEyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // BODY
    const bodyGeo = new THREE.SphereGeometry(0.75, 32, 32);
    bodyGeo.scale(1, 0.95, 0.9);
    const body = new THREE.Mesh(bodyGeo, mainMat);
    body.position.y = 0.2;
    body.castShadow = true;
    petGroup.add(body);

    // BELLY
    const bellyGeo = new THREE.SphereGeometry(0.5, 24, 24);
    bellyGeo.scale(0.85, 0.85, 0.4);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.15, 0.55);
    petGroup.add(belly);

    // HEAD
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.85, 0.1);

    const headGeo = new THREE.SphereGeometry(0.68, 32, 32);
    headGeo.scale(1.05, 0.95, 0.95);
    const head = new THREE.Mesh(headGeo, mainMat);
    head.castShadow = true;
    headGroup.add(head);

    // CHEEKS BLUSH
    const blushGeo = new THREE.SphereGeometry(0.12, 16, 16);
    blushGeo.scale(1, 0.5, 0.3);
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.45, -0.08, 0.55);
    headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.45, -0.08, 0.55);
    headGroup.add(rightBlush);

    // EYES
    const eyeGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.24, 0.05, 0.6);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.24, 0.05, 0.6);
    headGroup.add(rightEye);

    // Eye Sparkles
    const sparkleGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const leftSparkle = new THREE.Mesh(sparkleGeo, whiteEyeMat);
    leftSparkle.position.set(-0.21, 0.09, 0.68);
    headGroup.add(leftSparkle);

    const rightSparkle = new THREE.Mesh(sparkleGeo, whiteEyeMat);
    rightSparkle.position.set(0.27, 0.09, 0.68);
    headGroup.add(rightSparkle);

    // NOSE / SNOUT
    const noseGeo = new THREE.SphereGeometry(0.06, 16, 16);
    noseGeo.scale(1.2, 0.8, 0.8);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.04, 0.68);
    headGroup.add(nose);

    // EARS based on PetType
    const leftEarGroup = new THREE.Group();
    const rightEarGroup = new THREE.Group();

    if (pet.petType === 'bunny') {
      // Long bunny ears
      const earGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.8, 16);
      earGeo.scale(1, 1, 0.5);
      const earInnerGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.65, 16);
      earInnerGeo.scale(1, 1, 0.3);

      const leftEar = new THREE.Mesh(earGeo, mainMat);
      const leftInner = new THREE.Mesh(earInnerGeo, earInnerMat);
      leftInner.position.z = 0.05;
      leftEarGroup.add(leftEar, leftInner);
      leftEarGroup.position.set(-0.28, 0.9, 0);
      leftEarGroup.rotation.z = -0.15;
      leftEarGroup.rotation.x = -0.1;

      const rightEar = new THREE.Mesh(earGeo, mainMat);
      const rightInner = new THREE.Mesh(earInnerGeo, earInnerMat);
      rightInner.position.z = 0.05;
      rightEarGroup.add(rightEar, rightInner);
      rightEarGroup.position.set(0.28, 0.9, 0);
      rightEarGroup.rotation.z = 0.15;
      rightEarGroup.rotation.x = -0.1;
    } else if (pet.petType === 'panda') {
      // Round panda ears
      const earGeo = new THREE.SphereGeometry(0.22, 16, 16);
      const leftEar = new THREE.Mesh(earGeo, bellyMat);
      leftEarGroup.add(leftEar);
      leftEarGroup.position.set(-0.48, 0.52, 0);

      const rightEar = new THREE.Mesh(earGeo, bellyMat);
      rightEarGroup.add(rightEar);
      rightEarGroup.position.set(0.48, 0.52, 0);
    } else if (pet.petType === 'dragon') {
      // Dragon Horns & Wings
      const hornGeo = new THREE.ConeGeometry(0.12, 0.45, 16);
      const hornMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.4 });
      const leftHorn = new THREE.Mesh(hornGeo, hornMat);
      leftEarGroup.add(leftHorn);
      leftEarGroup.position.set(-0.32, 0.65, -0.1);
      leftEarGroup.rotation.z = -0.4;
      leftEarGroup.rotation.x = -0.3;

      const rightHorn = new THREE.Mesh(hornGeo, hornMat);
      rightEarGroup.add(rightHorn);
      rightEarGroup.position.set(0.32, 0.65, -0.1);
      rightEarGroup.rotation.z = 0.4;
      rightEarGroup.rotation.x = -0.3;

      // Small wings on body
      const wingGeo = new THREE.ConeGeometry(0.35, 0.6, 3);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xf87171, side: THREE.DoubleSide });
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-0.65, 0.4, -0.4);
      leftWing.rotation.set(0.3, 0.5, -1.2);
      petGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.position.set(0.65, 0.4, -0.4);
      rightWing.rotation.set(0.3, -0.5, 1.2);
      petGroup.add(rightWing);
    } else {
      // Cat / Fox Triangular ears
      const earGeo = new THREE.ConeGeometry(0.24, 0.42, 16);
      earGeo.scale(1, 1, 0.6);
      const earInnerGeo = new THREE.ConeGeometry(0.15, 0.3, 16);
      earInnerGeo.scale(1, 1, 0.4);

      const leftEar = new THREE.Mesh(earGeo, mainMat);
      const leftInner = new THREE.Mesh(earInnerGeo, earInnerMat);
      leftInner.position.z = 0.05;
      leftEarGroup.add(leftEar, leftInner);
      leftEarGroup.position.set(-0.38, 0.58, 0);
      leftEarGroup.rotation.z = -0.35;

      const rightEar = new THREE.Mesh(earGeo, mainMat);
      const rightInner = new THREE.Mesh(earInnerGeo, earInnerMat);
      rightInner.position.z = 0.05;
      rightEarGroup.add(rightEar, rightInner);
      rightEarGroup.position.set(0.38, 0.58, 0);
      rightEarGroup.rotation.z = 0.35;
    }

    headGroup.add(leftEarGroup, rightEarGroup);

    // ACCESSORIES (Graduation cap, crown, etc.)
    if (pet.equippedAccessory === 'grad_cap') {
      const capGroup = new THREE.Group();
      const capBaseGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const capBase = new THREE.Mesh(capBaseGeo, capMat);

      const capTopGeo = new THREE.BoxGeometry(0.7, 0.04, 0.7);
      const capTop = new THREE.Mesh(capTopGeo, capMat);
      capTop.position.y = 0.1;
      capTop.rotation.y = Math.PI / 4;

      const tasselGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const tasselMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const tassel = new THREE.Mesh(tasselGeo, tasselMat);
      tassel.position.set(0.3, 0.05, 0.2);

      capGroup.add(capBase, capTop, tassel);
      capGroup.position.set(0, 0.68, 0);
      headGroup.add(capGroup);
    } else if (pet.equippedAccessory === 'crown') {
      const crownGroup = new THREE.Group();
      const crownGeo = new THREE.CylinderGeometry(0.32, 0.25, 0.25, 5);
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
      const crownMesh = new THREE.Mesh(crownGeo, crownMat);
      crownGroup.add(crownMesh);
      crownGroup.position.set(0, 0.68, 0);
      headGroup.add(crownGroup);
    } else if (pet.equippedAccessory === 'glasses') {
      const glassesGroup = new THREE.Group();
      const rimGeo = new THREE.TorusGeometry(0.14, 0.025, 16, 32);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });

      const leftRim = new THREE.Mesh(rimGeo, rimMat);
      leftRim.position.set(-0.25, 0.05, 0.68);

      const rightRim = new THREE.Mesh(rimGeo, rimMat);
      rightRim.position.set(0.25, 0.05, 0.68);

      const bridgeGeo = new THREE.BoxGeometry(0.15, 0.02, 0.02);
      const bridge = new THREE.Mesh(bridgeGeo, rimMat);
      bridge.position.set(0, 0.05, 0.68);

      glassesGroup.add(leftRim, rightRim, bridge);
      headGroup.add(glassesGroup);
    } else if (pet.equippedAccessory === 'headphones') {
      const hpGroup = new THREE.Group();
      const bandGeo = new THREE.TorusGeometry(0.72, 0.04, 16, 32, Math.PI);
      const hpMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.2, metalness: 0.8 });
      const band = new THREE.Mesh(bandGeo, hpMat);
      band.rotation.z = Math.PI / 2;

      const earcupGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16);
      const earcupMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });

      const leftCup = new THREE.Mesh(earcupGeo, earcupMat);
      leftCup.rotation.z = Math.PI / 2;
      leftCup.position.set(-0.7, 0, 0);

      const rightCup = new THREE.Mesh(earcupGeo, earcupMat);
      rightCup.rotation.z = Math.PI / 2;
      rightCup.position.set(0.7, 0, 0);

      hpGroup.add(band, leftCup, rightCup);
      hpGroup.position.set(0, 0.45, 0);
      headGroup.add(hpGroup);
    } else if (pet.equippedAccessory === 'sparkles') {
      const auraGroup = new THREE.Group();
      const crystalGeo = new THREE.OctahedronGeometry(0.16);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.9,
        roughness: 0.1,
        metalness: 0.9,
      });

      for (let i = 0; i < 4; i++) {
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        const angle = (i / 4) * Math.PI * 2;
        crystal.position.set(Math.cos(angle) * 0.9, Math.sin(i * 1.5) * 0.3, Math.sin(angle) * 0.9);
        auraGroup.add(crystal);
      }
      auraGroup.position.set(0, 0.5, 0);
      headGroup.add(auraGroup);
    }

    petGroup.add(headGroup);

    // PAWS / FEET
    const pawGeo = new THREE.SphereGeometry(0.18, 16, 16);
    pawGeo.scale(1, 0.7, 1.3);

    const leftPaw = new THREE.Mesh(pawGeo, mainMat);
    leftPaw.position.set(-0.35, -0.4, 0.45);
    leftPaw.castShadow = true;

    const rightPaw = new THREE.Mesh(pawGeo, mainMat);
    rightPaw.position.set(0.35, -0.4, 0.45);
    rightPaw.castShadow = true;

    petGroup.add(leftPaw, rightPaw);

    // TAIL
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, -0.1, -0.6);

    if (pet.petType === 'bunny') {
      const tailGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const tail = new THREE.Mesh(tailGeo, bellyMat);
      tailGroup.add(tail);
    } else if (pet.petType === 'fox') {
      const tailGeo = new THREE.ConeGeometry(0.28, 0.8, 16);
      tailGeo.scale(1, 1, 0.8);
      const tail = new THREE.Mesh(tailGeo, mainMat);
      tail.rotation.x = -1.2;
      tail.position.set(0, 0.25, -0.3);
      tailGroup.add(tail);
    } else {
      const tailGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.65, 16);
      const tail = new THREE.Mesh(tailGeo, mainMat);
      tail.rotation.x = -0.9;
      tail.position.set(0, 0.2, -0.25);
      tailGroup.add(tail);
    }

    petGroup.add(tailGroup);
    scene.add(petGroup);

    // 7. Floating 3D Sparkle Particles around pet
    const particleCount = 20;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 3.5;
      particlePos[i + 1] = Math.random() * 2.5 - 0.2;
      particlePos[i + 2] = (Math.random() - 0.5) * 3.5;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xf472b6,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 8. Interaction State & Mouse Rotation Handling
    let mouseX = 0;
    let targetRotationY = 0;
    let isDragging = false;
    let previousMousePosition = { x: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / width) * 2 - 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        targetRotationY += deltaX * 0.015;
        previousMousePosition = { x: e.clientX };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        targetRotationY += deltaX * 0.015;
        previousMousePosition = { x: e.touches[0].clientX };
      }
    };
    const onTouchEnd = () => {
      isDragging = false;
    };
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 9. ANIMATION LOOP
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let jumpTime = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth rotation towards target
      petGroup.rotation.y += (targetRotationY - petGroup.rotation.y) * 0.1;
      pedestalGroup.rotation.y = petGroup.rotation.y * 0.3;

      // Subtle breathing & idle bobbing
      const breath = Math.sin(elapsedTime * 3) * 0.03;
      body.scale.set(1 + breath, 0.95 - breath, 0.9 + breath);
      petGroup.position.y = -0.3 + Math.sin(elapsedTime * 2) * 0.04;

      // Head slight look at mouse
      headGroup.rotation.y = mouseX * 0.3 + Math.sin(elapsedTime * 1.5) * 0.05;
      headGroup.rotation.x = Math.sin(elapsedTime * 2) * 0.04;

      // Tail wagging
      tailGroup.rotation.y = Math.sin(elapsedTime * 5) * 0.35;
      tailGroup.rotation.z = Math.cos(elapsedTime * 4) * 0.15;

      // Ear twitching
      leftEarGroup.rotation.z = -0.2 + Math.sin(elapsedTime * 6) * 0.08;
      rightEarGroup.rotation.z = 0.2 - Math.sin(elapsedTime * 6) * 0.08;

      // Action animations: Eat, Jump, etc.
      if (actionTrigger === 'eat') {
        headGroup.position.y = 0.85 + Math.sin(elapsedTime * 12) * 0.08;
        headGroup.rotation.x = Math.sin(elapsedTime * 12) * 0.15;
      } else if (actionTrigger === 'wash') {
        petGroup.rotation.z = Math.sin(elapsedTime * 10) * 0.08;
      } else if (actionTrigger === 'pet' || actionTrigger === 'levelUp') {
        jumpTime += 0.05;
        petGroup.position.y = -0.3 + Math.abs(Math.sin(jumpTime * 4)) * 0.4;
      }

      // Sparkle particles floating upwards
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        positions[i] += 0.008;
        if (positions[i] > 2.5) {
          positions[i] = -0.5;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [pet.petType, pet.equippedAccessory, pet.level, actionTrigger]);

  return (
    <div
      ref={mountRef}
      onClick={onPetClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-80 sm:h-96 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
    >
      {/* 3D Interaction Badge */}
      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-bold text-pink-300 pointer-events-none flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>3D Live Interactive Pet • Putar 360° &amp; Klik untuk Elus</span>
      </div>
    </div>
  );
};
