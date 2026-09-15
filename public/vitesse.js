/* =========================================================
   ACTE — LA VITESSE QUANTIQUE
   ---------------------------------------------------------
   Le vaisseau ne bouge pas. C'est le tunnel qui passe.

   Un vaisseau lancé à cette vitesse-là ne peut pas être montré
   en le déplaçant : il sortirait du cadre en une image. Ce qu'on
   montre, c'est ce qui défile autour, et la seule chose qui
   dise la vitesse, c'est la longueur des traits.
   ========================================================= */
(function () {
  'use strict';
  var T = window.ODN && window.ODN.travaux;
  if (!T || !window.ODN.acte) { return; }

  var LONG = 2600;

  window.ODN.acte({
    id: 'vitesse',
    champ: 62,
    souplesse: 6.5,

    monter: function (c) {
      /* ---- le tunnel ----
         Des traits répartis dans un tube creux autour de l'axe.
         Creux, parce qu'un trait qui traverse l'objectif remplit
         l'écran d'une barre. */
      var nb = c.petit ? 900 : 2400;
      c.brins = [];
      var pos = new Float32Array(nb * 6);
      var col = new Float32Array(nb * 6);
      var teinte = new THREE.Color();
      for (var i = 0; i < nb; i++) {
        /* Tube creux, et creux large : le bâtiment doit rester
           lisible au milieu, pas noyé sous les traits. */
        var r = 46 + Math.pow(Math.random(), 0.55) * 250;
        var a = Math.random() * 6.2832;
        c.brins.push({
          x: Math.cos(a) * r, y: Math.sin(a) * r * 0.85,
          z: -LONG / 2 + Math.random() * LONG,
          v: 0.7 + Math.random() * 0.8, r: r
        });
        teinte.set(r < 110 ? 0xe8ecf2 : (Math.random() > 0.72 ? 0xff5a5a : 0xb8bec8));
        var g = 0.35 + Math.random() * 0.65;
        for (var k = 0; k < 2; k++) {
          col[i * 6 + k * 3] = teinte.r * g;
          col[i * 6 + k * 3 + 1] = teinte.g * g;
          col[i * 6 + k * 3 + 2] = teinte.b * g;
        }
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      c.tunnel = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      c.scene.add(c.tunnel);

      /* ---- la bulle ----
         Le halo de compression qui enveloppe le bâtiment. C'est
         ce qui dit « quantique » plutôt que « rapide ». */
      c.bulle = new THREE.Mesh(
        new THREE.SphereGeometry(1, 30, 20),
        new THREE.ShaderMaterial({
          uniforms: { force: { value: 0 }, temps: { value: 0 } },
          vertexShader:
            'varying vec3 vN; varying vec3 vP;' +
            'void main(){ vN = normalize(normalMatrix * normal);' +
            ' vP = normalize((modelViewMatrix*vec4(position,1.0)).xyz);' +
            ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader:
            'uniform float force; uniform float temps; varying vec3 vN; varying vec3 vP;' +
            'void main(){' +
            ' float f = pow(1.0 - abs(dot(vN, -vP)), 2.6);' +
            ' float on = 0.72 + 0.28 * sin(temps*5.0 + vP.z*14.0);' +
            ' float a = f * force * on;' +
            ' gl_FragColor = vec4(mix(vec3(0.88,0.90,0.96), vec3(1.0,0.35,0.35), f*0.7), a); }',
          transparent: true, blending: THREE.AdditiveBlending,
          depthWrite: false, side: THREE.DoubleSide
        })
      );
      c.bulle.scale.set(52, 40, 120);
      c.scene.add(c.bulle);

      /* onde d'étrave, devant la bulle */
      c.etrave = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.halo(c), transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      c.etrave.scale.setScalar(120);
      c.scene.add(c.etrave);
    },

    approcher: function (c) {
      c.navire = T.coque('polaris', 92, T.ARGENT, 0.62);
      c.navire.position.set(0, 0, 0);
      c.scene.add(c.navire);
    },

    jouer: function (c, avance, dt, t) {
      var P = c.palier;
      var montee = P(avance, 0.04, 0.34);
      var croisiere = P(avance, 0.2, 0.62);
      var sortie = P(avance, 0.76, 1.0);
      var vit = montee * (1 - sortie * 0.94);

      /* La longueur des traits est ce qui porte la vitesse : un
         point qui va vite reste un point, un trait qui s'allonge
         se lit tout de suite. */
      var etirement = 4 + vit * 340;
      var glisse = (t * (60 + vit * 1400)) % LONG;
      var bp = c.tunnel.geometry.attributes.position.array;
      for (var i = 0; i < c.brins.length; i++) {
        var b = c.brins[i];
        var z = b.z + glisse * b.v;
        z = ((z + LONG / 2) % LONG) - LONG / 2;
        bp[i * 6] = b.x; bp[i * 6 + 1] = b.y; bp[i * 6 + 2] = z;
        bp[i * 6 + 3] = b.x; bp[i * 6 + 4] = b.y;
        bp[i * 6 + 5] = z - etirement * b.v;
      }
      c.tunnel.geometry.attributes.position.needsUpdate = true;
      c.tunnel.material.opacity = 0.14 + vit * 0.46;

      c.bulle.material.uniforms.force.value = vit * 0.5;
      c.bulle.material.uniforms.temps.value = t;
      c.bulle.scale.set(48 + vit * 10, 36 + vit * 8, 110 + vit * 90);
      c.bulle.position.z = -10 - vit * 30;

      /* L'onde d'étrave est devant la proue, pas devant
         l'objectif : trop grande, elle lavait toute l'image. */
      c.etrave.position.set(0, 0, 52 + vit * 16);
      c.etrave.material.opacity = vit * 0.28;
      c.etrave.scale.setScalar(40 + vit * 42);

      T.pousser(c.navire, 0.5 + vit * 1.3, t);

      /* Le bâtiment vibre à peine : à cette vitesse, ce qui bouge
         n'est pas lui. */
      if (c.navire) {
        c.navire.rotation.z = Math.sin(t * 0.6) * 0.02 * (1 + vit);
        c.navire.rotation.x = Math.sin(t * 0.43) * 0.012;
        c.navire.position.y = Math.sin(t * 0.8) * 0.9 * vit;
      }

      /* caméra : elle part de l'arrière, remonte le long du
         bâtiment, et finit devant l'étrave */
      var m1 = P(avance, 0.0, 0.42);
      var m2 = P(avance, 0.36, 0.78);
      var m3 = P(avance, 0.7, 1.0);
      /* Elle reste au large du bâtiment et le garde dans le cadre :
         sinon il disparaît dans son propre sillage. */
      c.camera.position.set(
        -54 + m1 * 18 + m2 * 40 - m3 * 24,
        16 - m1 * 8 + m2 * 6 + m3 * 14,
        -126 + m1 * 62 + m2 * 96 + m3 * 76
      );
      c.camera.lookAt(new THREE.Vector3(0, 0, -10 + m1 * 14 + m2 * 26 + m3 * 40));
      c.camera.rotation.z += Math.sin(t * 0.5) * 0.02 + vit * Math.sin(t * 26) * 0.004;
      void croisiere;
    }
  });
})();
