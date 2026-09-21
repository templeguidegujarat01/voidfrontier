/**
 * The nine equippable module categories (matches the design blueprint's
 * ship-system spec: engines, weapons, shields, armor, energy, cargo,
 * mining, radar, utilities) plus the Core Frame every ship is built on.
 */
export var ModuleCategory;
(function (ModuleCategory) {
    ModuleCategory["CoreFrame"] = "CoreFrame";
    ModuleCategory["Drive"] = "Drive";
    ModuleCategory["Emitter"] = "Emitter";
    ModuleCategory["Wardplate"] = "Wardplate";
    ModuleCategory["Hullweave"] = "Hullweave";
    ModuleCategory["Reactor"] = "Reactor";
    ModuleCategory["Hold"] = "Hold";
    ModuleCategory["Drill"] = "Drill";
    ModuleCategory["Array"] = "Array";
    ModuleCategory["UtilityRig"] = "UtilityRig"; // utilities
})(ModuleCategory || (ModuleCategory = {}));
//# sourceMappingURL=ModuleTypes.js.map