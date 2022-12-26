const ID = "zap";

// Create an inspector element
const inspector = document.createElement("div");
inspector.id = `${ID}-inspector`;
inspector.style.position = "absolute";
inspector.style.top = "";
inspector.style.left = "";
inspector.style.width = "";
inspector.style.height = "";
inspector.style.pointerEvents = "none";
inspector.style.border = "2px solid red";
inspector.style.background =
	"repeating-linear-gradient(45deg, transparent, transparent 0.5rem, rgba(255, 0, 0, 0.5) 0.5rem, rgba(255, 0, 0, 0.5) 1rem)";
inspector.style.opacity = 0;
inspector.style.zIndex = 1000000;
document.body.appendChild(inspector);

// Create an indicator element
const indicator = document.createElement("div");
indicator.id = `${ID}-indicator`;
indicator.style.position = "absolute";
indicator.style.top = "0.25rem";
indicator.style.left = "0.25rem";
indicator.style.width = "0.5rem";
indicator.style.height = "0.5rem";
indicator.style.borderRadius = "50%";
indicator.style.background = "red";
indicator.style.opacity = 0;
indicator.style.transition = "opacity 0.5s";
indicator.style.zIndex = 1000000;
document.body.appendChild(indicator);

// Keep track of whether the inspector should destroy or hide
let shouldDestroy = false;

// Configure theRoom
window.theRoom.configure({
	inspector: `#${inspector.id}`,
	excludes: [`#${indicator.id}`, `#${inspector.id}`],
	click: (element, event) => {
		event.preventDefault();

		// Add to store
		addToStore(element, shouldDestroy);
		updateDOM([element]);

		// Stop theRoom
		window.theRoom.stop(true);
		// Hide the inspector
		inspector.style.opacity = 0;
	},
});

Hooks.on("init", () => {
	// Register a keybinding
	game.keybindings.register(ID, "hide", {
		name: `${ID}.keybindings.hide.name`,
		hint: `${ID}.keybindings.hide.hint`,
		onDown: () => {
			// Start theRoom
			window.theRoom.start();
			// Show the inspector
			inspector.style.opacity = 1;
		},
	});
	game.keybindings.register(ID, "destroy", {
		name: `${ID}.keybindings.destroy.name`,
		hint: `${ID}.keybindings.destroy.hint`,
		onDown: () => {
			// Toggle the indicator
			indicator.style.opacity = shouldDestroy ? 0 : 1;
			// Toggle whether the inspector should destroy or hide
			shouldDestroy = !shouldDestroy;
		},
	});

	// Register a client setting
	game.settings.register(ID, "store", {
		scope: "client",
		type: Object,
		default: {
			hidden: [],
			destroyed: [],
		},
		config: false,
	});

	// Register a settings menu as a reset button
	game.settings.registerMenu(ID, "reset", {
		name: `${ID}.settings.reset.name`,
		label: `${ID}.settings.reset.label`,
		icon: "fas fa-trash",
		type: class extends FormApplication {
			constructor(...args) {
				super(...args);
				(async () => {
					await Dialog.confirm({
						title: game.i18n.localize(`${ID}.settings.reset.confirm.title`),
						content: game.i18n.localize(`${ID}.settings.reset.confirm.content`),
					});
					game.settings.set(ID, "store", {
						hidden: [],
						destroyed: [],
					});
				})();
			}

			// Don't render anything
			render() {
				return;
			}
		},
		restricted: true,
	});

	// Apply initial updates
	updateDOM([...document.body.querySelectorAll("*")]);
});

// Update the DOM when a new application is rendered
Hooks.on("renderApplication", applicationRendered);
Hooks.on("renderSidebarTab", applicationRendered);
Hooks.on("renderActorSheet", applicationRendered);
Hooks.on("renderItemSheet", applicationRendered);

function applicationRendered(_app, [html]) {
	console.log(html);
	updateDOM([...html.querySelectorAll("*")]);
}

function addToStore(element, destroy = false) {
	const selector = getSelector(element);
	const store = game.settings.get(ID, "store");

	if (destroy) {
		store.destroyed.push(selector);
	} else {
		store.hidden.push(selector);
	}

	game.settings.set(ID, "store", store);
}

function getSelector(element) {
	const selector = [];
	while (element.parentNode) {
		selector.push(
			`${element.tagName.toLowerCase()}${[...element.attributes]
				.flatMap(({ name, value }) => {
					if (!value || name === "style" || name.startsWith("aria-")) return;
					return value.split(" ").map(v => {
						if (!v || (name === "class" && v === "theRoom") || v === "active") return;
						console.log(name, v);
						if (name === "class") {
							return `.${v}`;
						} else if (name === "id") {
							return `#${v}`;
						}
						return `[${name}="${v.replace('"', '\\"')}"]`;
					});
				})
				.join("")}`
		);
		element = element.parentNode;
	}
	return selector.reverse().join(" > ");
}

function updateDOM(elements) {
	// Load from store
	const store = game.settings.get(ID, "store");
	const { hidden, destroyed } = store;
	globalThis.zap = { hidden, destroyed };

	// Remove any invalid CSS selectors from the store
	const invalid = false;
	[...hidden, ...destroyed].forEach((selector, i) => {
		try {
			document.querySelector(selector);
		} catch (error) {
			invalid = true;
			if (i < hidden.length) {
				hidden.splice(i, 1);
			} else {
				destroyed.splice(i - hidden.length, 1);
			}
		}
	});
	if (invalid) {
		ui.notifications.warn(game.i18n.localize(`${ID}.notifications.invalid`));
		game.settings.set(ID, "store", store);
	}

	// If the element is in the store, hide or destroy it
	elements.forEach(element => {
		hidden.forEach(selector => {
			console.log(element);
			if (element.matches(selector)) {
				element.style.visibility = "hidden";
			}
		});
		destroyed.forEach(selector => {
			if (element.matches(selector)) {
				element.remove();
			}
		});
	});
}
