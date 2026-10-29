"""Interactive 3D spatial concept visualization skill powered by Three.js."""

from __future__ import annotations

from typing import Any, Dict

from skills.registry import BaseSkill, VisualOutput, wrap_in_html_page


class ThreeDSkill(BaseSkill):
    """Generates interactive 3D spatial scenes with pedagogical blanks."""

    name = "three_d"
    description = "Renders interactive 3D spatial models (matrix transforms, vector spaces) with Three.js."

    def render(self, spec: Dict[str, Any]) -> VisualOutput:
        """Render self-contained Three.js 3D interactive viewer."""
        concept = spec.get("concept", "3d_matrix_transformation")
        blank_target = spec.get("blank_target", "[0, 1, 0]")
        prompt = spec.get(
            "prediction_prompt",
            "Drag to orbit the 3D space. After a 90° rotation around the Z-axis, where does basis vector î land?",
        )

        three_js_scripts = """
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
"""

        body_html = f"""
<div style="position: relative; width: 100%; height: 420px; background: #090d16; border-radius: 8px; overflow: hidden; border: 1px solid #334155;">
  <div id="threejs-canvas-container" style="width: 100%; height: 100%;"></div>
  <div style="position: absolute; top: 12px; left: 12px; background: rgba(15, 23, 42, 0.85); border: 1px solid #334155; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; color: #94a3b8; pointer-events: none;">
    🖱️ Left Click + Drag: Orbit &middot; Scroll: Zoom &middot; Right Click: Pan
  </div>
</div>

<div style="background: #1e293b; border-left: 4px solid #38bdf8; padding: 1rem; border-radius: 4px; margin-top: 1rem;">
  <div style="font-weight: 600; color: #38bdf8; margin-bottom: 0.5rem;">📐 3D Spatial Challenge</div>
  <p style="margin: 0; line-height: 1.5;">{prompt}</p>
  <div style="margin-top: 0.75rem;">
    Target coordinate: <span class="blank-pill">???</span>
  </div>
</div>

<script>
  (function() {{
    const container = document.getElementById("threejs-canvas-container");
    if (!container || typeof THREE === "undefined") {{
      container.innerHTML = "<div style='padding:2rem;color:#f87171;'>Three.js script loading failed or running in headless viewer.</div>";
      return;
    }}

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(5, 5, 7);

    const renderer = new THREE.WebGLRenderer({{ antialias: true }});
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Grid and axes
    const gridHelper = new THREE.GridHelper(10, 10, 0x334155, 0x1e293b);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(4);
    scene.add(axesHelper);

    // 3D Basis Vectors or Lattice
    const origin = new THREE.Vector3(0, 0, 0);

    // X Vector (Red)
    const dirX = new THREE.Vector3(1, 0, 0);
    const arrowX = new THREE.ArrowHelper(dirX, origin, 2.5, 0xf87171, 0.4, 0.2);
    scene.add(arrowX);

    // Y Vector (Green)
    const dirY = new THREE.Vector3(0, 1, 0);
    const arrowY = new THREE.ArrowHelper(dirY, origin, 2.5, 0x4ade80, 0.4, 0.2);
    scene.add(arrowY);

    // Z Vector (Blue)
    const dirZ = new THREE.Vector3(0, 0, 1);
    const arrowZ = new THREE.ArrowHelper(dirZ, origin, 2.5, 0x38bdf8, 0.4, 0.2);
    scene.add(arrowZ);

    // Transformed vector (Orange dashed/glowing target)
    const dirTrans = new THREE.Vector3(0, 2.5, 0);
    const arrowTrans = new THREE.ArrowHelper(dirTrans, origin, 2.5, 0xfb923c, 0.5, 0.25);
    scene.add(arrowTrans);

    // Geometry box wireframe
    const geom = new THREE.BoxGeometry(2, 2, 2);
    const wireframe = new THREE.WireframeGeometry(geom);
    const line = new THREE.LineSegments(wireframe);
    line.material.color.setHex(0x6366f1);
    line.material.opacity = 0.4;
    line.material.transparent = true;
    line.position.set(1, 1, 1);
    scene.add(line);

    function animate() {{
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }}
    animate();

    window.addEventListener("resize", () => {{
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }});
  }})();
</script>
"""
        full_html = wrap_in_html_page(
            title=f"3D Spatial Model: {concept.replace('_', ' ').title()}",
            body_content=body_html,
            extra_scripts=three_js_scripts,
        )

        return VisualOutput(
            skill=self.name,
            concept=concept,
            html=full_html,
            has_blanks=True,
            metadata={
                "blank_target": blank_target,
                "engine": "three_js",
                "prediction_prompt": prompt,
            },
        )

