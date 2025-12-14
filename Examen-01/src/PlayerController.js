/**
 * PlayerController - Controlador de personajes jugables
 */
export class PlayerController {
    static CONFIG = {
        walkSpeed: 0.08, runSpeed: 0.16, rotationSpeed: 0.12, manualRotationSpeed: 0.01,
        cameraDistance: 5, cameraHeight: 3, cameraSmoothness: 0.1,
        raycastDistance: 1.2, characterRadius: 0.5
    };

    static KEY_MAPPINGS = {
        w: 'forward', s: 'backward', a: 'left', d: 'right',
        shift: 'run', q: 'rotateLeft', e: 'rotateRight'
    };

    constructor(scene, camera) {
        Object.assign(this, { scene, camera, characters: [], currentCharacterIndex: 0, currentCharacter: null });
        this.moveState = { forward: false, backward: false, left: false, right: false, run: false, attack: false, rotateLeft: false, rotateRight: false };
        this.collisionMeshes = [];
        this.currentAnimation = null;
        this.isAttacking = false;
        this.setupInputControls();
    }
    
    addCharacter(characterData) {
        const ANIM_TYPES = ['idle', 'walk', 'run', 'attack'];
        const animations = Object.fromEntries(ANIM_TYPES.map(t => [t, null]));
        
        characterData.animationGroups.forEach(anim => {
            const name = anim.name.toLowerCase();
            ANIM_TYPES.forEach(type => { if (name.includes(type)) animations[type] = anim; });
            anim.stop();
        });

        const character = { name: characterData.name, rootMesh: characterData.rootMesh, animationGroups: characterData.animationGroups, animations };
        this.characters.push(character);
        console.log(`✓ Personaje agregado: ${character.name}, Animaciones: ${ANIM_TYPES.filter(k => animations[k]).join(', ')}`);
        return character;
    }

    setActiveCharacter(index) {
        if (index < 0 || index >= this.characters.length) return;
        if (this.currentCharacter) this.stopAllAnimations(this.currentCharacter);
        this.currentCharacterIndex = index;
        this.currentCharacter = this.characters[index];
        this.playAnimation('idle');
        console.log(`🎮 Personaje activo: ${this.currentCharacter.name}`);
    }

    switchCharacter() { this.setActiveCharacter((this.currentCharacterIndex + 1) % this.characters.length); }
    
    setupInputControls() {
        this.scene.onKeyboardObservable.add(kbInfo => {
            const key = kbInfo.event.key.toLowerCase();
            const isPressed = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
            
            if (PlayerController.KEY_MAPPINGS[key]) {
                this.moveState[PlayerController.KEY_MAPPINGS[key]] = isPressed;
            } else if (key === 'c' && isPressed) {
                this.switchCharacter();
            } else if (key === 'i' && isPressed) {
                this.toggleControls();
            }
        });

        this.scene.onPointerObservable.add(pointerInfo => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
                this.performAttack();
            }
        });
    }

    toggleControls() {
        const controls = document.getElementById('controls');
        const position = document.getElementById('positionInfo');
        if (!controls) return;
        const show = controls.style.display === 'none';
        controls.style.display = show ? 'block' : 'none';
        if (position) position.style.display = show ? 'block' : 'none';
    }
    
    update() {
        if (!this.currentCharacter || this.isAttacking) { this.updateCamera(); return; }
        
        const { forward, backward, left, right, run, rotateLeft, rotateRight } = this.moveState;
        const character = this.currentCharacter;
        const { walkSpeed, runSpeed, manualRotationSpeed, raycastDistance } = PlayerController.CONFIG;
        
        // Rotación manual
        if (rotateLeft || rotateRight) {
            const delta = (rotateLeft ? 1 : -1) * manualRotationSpeed;
            character.rootMesh.rotation.y += delta;
        }
        
        // Calcular dirección
        let moveX = (right ? 1 : 0) - (left ? 1 : 0);
        let moveZ = (forward ? 1 : 0) - (backward ? 1 : 0);
        const isMoving = moveX !== 0 || moveZ !== 0;
        
        if (isMoving) {
            const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= magnitude;
            moveZ /= magnitude;
            const speed = run ? runSpeed : walkSpeed;
            const currentPos = character.rootMesh.position.clone();
            currentPos.y += 0.5;
            const moveDir = new BABYLON.Vector3(moveX, 0, moveZ);
            
            if (!this.checkCollision(currentPos, moveDir)) {
                character.rootMesh.position.x += moveX * speed;
                character.rootMesh.position.z += moveZ * speed;
            } else {
                // Deslizamiento
                if (Math.abs(moveX) > 0.01 && !this.checkCollision(currentPos, new BABYLON.Vector3(moveX, 0, 0).normalize()))
                    character.rootMesh.position.x += moveX * speed * 0.3;
                if (Math.abs(moveZ) > 0.01 && !this.checkCollision(currentPos, new BABYLON.Vector3(0, 0, moveZ).normalize()))
                    character.rootMesh.position.z += moveZ * speed * 0.3;
            }
            
            if (!rotateLeft && !rotateRight)
                character.rootMesh.rotation.y = Math.atan2(moveX, moveZ);
            
            this.playAnimation(run ? 'run' : 'walk');
        } else {
            this.playAnimation('idle');
        }
        
        this.updateCamera();
    }

    updateCamera() {
        if (this.currentCharacter) this.camera.setTarget(this.currentCharacter.rootMesh.position);
    }
    
    playAnimation(animName) {
        if (!this.currentCharacter) return;
        const anim = this.currentCharacter.animations[animName];
        if (!anim || (this.currentAnimation === anim && anim.isPlaying)) return;
        this.currentAnimation?.stop();
        anim.start(true, 1.0, anim.from, anim.to, false);
        this.currentAnimation = anim;
    }

    stopAllAnimations(character) { character.animationGroups.forEach(a => a.stop()); }

    performAttack() {
        if (!this.currentCharacter || this.isAttacking) return;
        const attackAnim = this.currentCharacter.animations.attack;
        if (!attackAnim) return;
        
        this.isAttacking = true;
        this.currentAnimation?.stop();
        attackAnim.start(false, 1.0, attackAnim.from, attackAnim.to, false);
        attackAnim.onAnimationEndObservable.addOnce(() => { this.isAttacking = false; this.playAnimation('idle'); });
        this.currentAnimation = attackAnim;
        console.log('⚔️ Ataque!');
    }

    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        return a + diff * t;
    }

    setCollisionMeshes(meshes) {
        this.collisionMeshes = meshes;
        console.log('🎯 Meshes de colisión:', meshes.length);
    }

    checkCollision(from, direction) {
        if (!this.collisionMeshes.length) return false;
        const ray = new BABYLON.Ray(from, direction, PlayerController.CONFIG.raycastDistance);
        const hit = this.scene.pickWithRay(ray, mesh => this.collisionMeshes.includes(mesh));
        return hit?.hit;
    }

    getCurrentCharacterInfo() {
        if (!this.currentCharacter) return null;
        return { name: this.currentCharacter.name, index: this.currentCharacterIndex, total: this.characters.length, position: this.currentCharacter.rootMesh.position.clone() };
    }
}
