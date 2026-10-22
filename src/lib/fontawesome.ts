// Font Awesome ships its CSS in the server-rendered page instead of injecting it at runtime,
// so SVG icons never flash at full size before hydration.
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

config.autoAddCss = false;
