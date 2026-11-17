import { library as intelligentUiLibrary } from "@openuidev/intelligent-ui-library";
import { actions } from "./actions";
import "./components/theme.css";
import "./components/components.css";
import "./components/map/map.css";
import { MapMarker, MapView } from "./components/map/map";
import { SearchImage } from "./components/search-image";

/**
 * @openuidev/intelligent-ui-library (the components and @functions a model
 * composes) plus what only this app can do: photos it finds for a query, a
 * street map, and copying to the clipboard.
 */
export const library = intelligentUiLibrary.extend({
  components: { add: [SearchImage, MapView, MapMarker] },
  actions: { add: actions },
});

// The CLI (npm run prompt) picks up these exports by name.
export { dashboardPromptOptions, promptOptions } from "./prompt-options";
