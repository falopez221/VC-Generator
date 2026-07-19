import { AerialSimulationLab } from "@/src/lab/components/AerialSimulationLab";

/**
 * Dedicated, authenticated presentation of the bounded aerial simulation engine.
 *
 * Access enforcement stays server-side in the protected route and its lab gate;
 * this component only presents the verified private session and model boundary.
 */
export function PrivateAerialSimulation() {
  return (
    <section
      className="private-aerial-simulation"
      aria-labelledby="private-aerial-simulation-title"
      data-classification="private-authenticated"
    >
      <header className="platform-page-heading">
        <div>
          <p>PRIVATE / DEDICATED LAB</p>
          <h1 id="private-aerial-simulation-title">Aerial resilience workspace</h1>
        </div>
        <p>
          A separate lab credential and authorization scope protect this workspace
          beyond general private-platform access.
        </p>
      </header>

      <div className="private-workflow-notice" role="note" aria-label="Access and model boundary">
        <strong>LAB SESSION VERIFIED</strong>
        <span>
          Dedicated lab credential verified server-side. Access expires automatically
          and remains bound to the current workspace identity.
        </span>
        <form className="private-aerial-lock" method="post" action="/api/private/aerial-simulation/session">
          <input type="hidden" name="action" value="lock" />
          <button className="platform-secondary-button" type="submit">Lock lab session</button>
        </form>
      </div>

      <section className="platform-panel" aria-labelledby="private-aerial-boundary-title">
        <header>
          <div>
            <span>PRIVATE SESSION · SYNTHETIC · NON-OPERATIONAL</span>
            <h2 id="private-aerial-boundary-title">Private access does not expand operational authority</h2>
          </div>
        </header>
        <p className="platform-caveat">
          The workspace uses normalized fictitious data, reproducible seeds and a
          bounded mathematical core for human review.
        </p>
        <ul className="platform-rule-list">
          <li>No real geography, live feeds, weapons, physical control or operational instructions.</li>
          <li>The only visible specialist perspectives are Mathematics, Finance, Strategy and Marketing.</li>
          <li>No private prompts, hidden agent network or proprietary orchestration are exposed.</li>
          <li>Outputs remain synthetic estimates; no run authorizes a real-world decision.</li>
        </ul>
      </section>

      <aside className="private-aerial-capacity" role="note" aria-label="Private capacity reference">
        <div>
          <span>Private agent-capacity reference</span>
          <strong>1,920</strong>
        </div>
        <p>
          Fixed private configuration reference. It is not a live inventory, deployment,
          allocation, readiness signal, or authorization; this workspace still exposes
          only the four bounded analytical perspectives shown below.
        </p>
      </aside>

      <section className="private-aerial-mathematics" aria-labelledby="private-aerial-mathematics-title">
        <header>
          <div>
            <span>LECTURA MATEMATICA</span>
            <h2 id="private-aerial-mathematics-title">Modelo demostrativo: linea por linea</h2>
          </div>
          <p>Cada variable es sintetica y adimensional. El relieve visual y la referencia privada de capacidad 1,920 no entran en ninguna ecuacion.</p>
        </header>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>Vector de estado</h3>
              <p className="private-aerial-equation"><i>s</i><sub>k</sub> = [<i>x</i><sub>k</sub>, <i>y</i><sub>k</sub>, <i>v</i><sub>x,k</sub>, <i>v</i><sub>y,k</sub>]<sup>T</sup></p>
              <p><b>Lectura:</b> posicion en un plano normalizado y las dos componentes de velocidad normalizada en el paso <i>k</i>. No representa coordenadas, metros ni objetos reales.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Dinamica acotada</h3>
              <p className="private-aerial-equation">d<i>s</i>/d<i>t</i> = [<i>v</i><sub>x</sub>, <i>v</i><sub>y</sub>, <i>f</i><sub>x</sub> − <i>d</i><i>v</i><sub>x</sub> − <i>r</i><i>x</i>, <i>f</i><sub>y</sub> − <i>d</i><i>v</i><sub>y</sub> − <i>r</i><i>y</i>]<sup>T</sup></p>
              <p><b>Lectura:</b> el forzamiento sintetico <i>f</i>, el amortiguamiento <i>d</i> y el termino restaurador <i>r</i> forman un campo visual acotado. Despues de cada paso se recortan <i>x</i>, <i>y</i> a [-2, 2] y las velocidades a [-1, 1].</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Propagacion RK4</h3>
              <p className="private-aerial-equation"><i>k</i><sub>1</sub> = <i>f</i>(<i>s</i><sub>k</sub>), <i>k</i><sub>2</sub> = <i>f</i>(<i>s</i><sub>k</sub> + Δ<i>t</i><i>k</i><sub>1</sub>/2), <i>k</i><sub>3</sub> = <i>f</i>(<i>s</i><sub>k</sub> + Δ<i>t</i><i>k</i><sub>2</sub>/2), <i>k</i><sub>4</sub> = <i>f</i>(<i>s</i><sub>k</sub> + Δ<i>t</i><i>k</i><sub>3</sub>)</p>
              <p className="private-aerial-equation"><i>s</i><sub>k+1</sub> = <i>s</i><sub>k</sub> + Δ<i>t</i>(<i>k</i><sub>1</sub> + 2<i>k</i><sub>2</sub> + 2<i>k</i><sub>3</sub> + <i>k</i><sub>4</sub>)/6</p>
              <p><b>Lectura:</b> cuatro evaluaciones de pendiente forman la propagacion determinista. RK4 es el metodo por defecto de los escenarios actuales; Euler y Heun se muestran solo como comparaciones numericas. El paso se acota a [10<sup>-3</sup>, 1].</p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Modelo de observacion</h3>
              <p className="private-aerial-equation"><i>z</i><sub>k</sub> = clip<sub>[-2,2]<sup>2</sup></sub>(<i>p</i><sub>k</sub> + <i>b</i> + &sigma;&epsilon;), &nbsp; &epsilon; &sim; N(0, <i>I</i>)</p>
              <p><b>Lectura:</b> una deteccion ve solo posicion y combina sesgo fijo <i>b</i> con ruido gaussiano sembrado antes del recorte. Hay deteccion Bernoulli, misses y observaciones falsas uniformes; el filtro no estima ni corrige <i>b</i>.</p>
            </div>
          </li>
          <li>
            <span>05</span>
            <div>
              <h3>Prediccion, compuerta y asociacion</h3>
              <p className="private-aerial-equation"><i>F</i> = [[1, 0, &Delta;<i>t</i>, 0], [0, 1, 0, &Delta;<i>t</i>], [0, 0, 1, 0], [0, 0, 0, 1]]</p>
              <p className="private-aerial-equation">ŝ<sup>−</sup><sub>k</sub> = <i>F</i>ŝ<sub>k−1</sub>, &nbsp; <i>P</i><sup>−</sup><sub>k</sub> = <i>F</i><i>P</i><sub>k−1</sub><i>F</i><sup>T</sup> + <i>Q</i></p>
              <p className="private-aerial-equation"><i>d</i><sub>M</sub><sup>2</sup> = (<i>z</i> − <i>H</i>ŝ<sup>−</sup>)<sup>T</sup><i>S</i><sup>−1</sup>(<i>z</i> − <i>H</i>ŝ<sup>−</sup>) ≤ <i>g</i>, &nbsp; <i>S</i> = <i>H</i><i>P</i><sup>−</sup><i>H</i><sup>T</sup> + <i>R</i></p>
              <p><b>Lectura:</b> el estimador usa <i>F</i> de velocidad constante, distinto de la dinamica forzada y amortiguada de la verdad sintetica; <i>Q</i> es su covarianza cinematica. Se acepta una medicion si d<sub>M</sub><sup>2</sup> &le; <i>g</i>, y luego se asocia greedy uno a uno. <i>g</i> = 5.991 es una referencia nominal de &chi;<sup>2</sup><sub>2</sub>(0.95), no cobertura empirica.</p>
            </div>
          </li>
          <li>
            <span>06</span>
            <div>
              <h3>Correccion de Kalman</h3>
              <p className="private-aerial-equation"><i>K</i><sub>k</sub> = <i>P</i><sup>−</sup><i>H</i><sup>T</sup><i>S</i><sup>−1</sup>, &nbsp; ŝ<sub>k</sub> = ŝ<sup>−</sup><sub>k</sub> + <i>K</i><sub>k</sub>(<i>z</i><sub>k</sub> − <i>H</i>ŝ<sup>−</sup><sub>k</sub>)</p>
              <p className="private-aerial-equation"><i>P</i><sub>k</sub> = (<i>I</i> − <i>K</i><i>H</i>)<i>P</i><sup>−</sup>(<i>I</i> − <i>K</i><i>H</i>)<sup>T</sup> + <i>K</i><i>R</i><i>K</i><sup>T</sup></p>
              <p><b>Lectura:</b> la innovacion se pondera por incertidumbre relativa y <i>R</i> = &sigma;<sup>2</sup><i>I</i>. La actualizacion de covarianza usa la forma de Joseph, que ayuda a preservar una matriz semidefinida positiva bajo error de punto flotante.</p>
            </div>
          </li>
          <li>
            <span>07</span>
            <div>
              <h3>Elipse de incertidumbre</h3>
              <p className="private-aerial-equation"><i>a</i><sub>95</sub> = √[−2 ln(1 − 0.95)] √λ<sub>max</sub>, &nbsp; <i>b</i><sub>95</sub> = √[−2 ln(1 − 0.95)] √λ<sub>min</sub></p>
              <p><b>Lectura:</b> &lambda;<sub>max</sub> y &lambda;<sub>min</sub> son autovalores del bloque posicional 2x2. Para 0.95 el factor radial es aproximadamente 2.448: es una elipse marginal nominal bajo la hipotesis gaussiana, no cobertura validada ni una huella fisica.</p>
            </div>
          </li>
          <li>
            <span>08</span>
            <div>
              <h3>Monte Carlo sembrado</h3>
              <p className="private-aerial-equation">ŝ<sup>(j)</sup> = ŝ + <i>L</i>ε<sup>(j)</sup>, &nbsp; ε<sup>(j)</sup> ∼ N(0, <i>I</i>), &nbsp; <i>L</i><i>L</i><sup>T</sup> = <i>P</i><sub>xy</sub></p>
              <p><b>Lectura:</b> el factor triangular inferior <i>L</i> lleva normales estandar a la covarianza posicional final 2D. Los 600 draws sembrados producen P10, P50 y P90 del indice demostrativo; no remuestrean trayectorias, misses, sesgos, falsas observaciones ni capacidad.</p>
            </div>
          </li>
          <li>
            <span>09</span>
            <div>
              <h3>Indice demostrativo y limite de revision</h3>
              <p className="private-aerial-equation"><i>R</i> = 0.25<i>P</i><sub>prox</sub> + 0.20<i>M</i><sub>motion</sub> + 0.20<i>U</i> + 0.25<i>C</i> + 0.10<i>E</i><sub>penalty</sub></p>
              <p className="private-aerial-equation"><i>A</i> = Top<sub><i>C</i></sub>&#123;<i>i</i> : <i>R</i><sub>i</sub> ≥ τ&#125;</p>
              <p><b>Lectura:</b> los cinco terminos estan acotados en [0, 100] y los pesos fijos suman uno. La asignacion toma los primeros <i>C</i> indices finales que superan el umbral; son canales abstractos de revision humana, no agentes ejecutando tareas ni autorizaciones.</p>
            </div>
          </li>
        </ol>
      </section>

      <div aria-label="Authenticated aerial simulation demonstrator">
        <AerialSimulationLab surface="private" />
      </div>
    </section>
  );
}
