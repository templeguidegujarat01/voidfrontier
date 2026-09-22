/** Modes that are real and playable right now. Everything else in the design doc is listed in the menu but marked unavailable — never faked. */
export const AVAILABLE_MODES = [
    {
        id: 'practice',
        name: 'Practice',
        shortDesc: 'Untimed sandbox vs. bots. Learn mining, combat, and your build. No match end.',
        available: true
    },
    {
        id: 'frontier-ffa',
        name: 'Frontier FFA (vs Bots)',
        shortDesc: 'Free-for-all with a kill target and clock. Every bot is independent — first to the target wins.',
        available: true
    },
    {
        id: 'local-dev-multiplayer',
        name: 'Local Multiplayer (Dev Server)',
        shortDesc: 'Connects to a Void Frontier server running on your machine. Movement sync only in this build — see README.',
        available: true
    }
];
/** Listed honestly as not-yet-built rather than wired to fake behavior. */
export const PLANNED_MODES = [
    { id: 'team-war', name: 'Team War', shortDesc: '7v7 organized team combat.', available: false, unavailableReason: 'Requires multiplayer server — coming soon' },
    { id: 'team-vs-solo', name: 'Team vs Solo', shortDesc: 'One organized team against independent solo players.', available: false, unavailableReason: 'Requires multiplayer server — coming soon' },
    { id: 'solo-duel', name: 'Solo Duel', shortDesc: 'Strictly solo — no teaming, ever.', available: false, unavailableReason: 'Requires multiplayer server — coming soon' },
    { id: 'coop-training', name: 'Co-op / Frontier Training', shortDesc: 'Human players cooperate against scaling AI.', available: false, unavailableReason: 'Requires multiplayer server — coming soon' },
    { id: 'private-room', name: 'Private Room', shortDesc: 'Host a room with a code, invite friends.', available: false, unavailableReason: 'Requires multiplayer server — coming soon' }
];
//# sourceMappingURL=MatchConfig.js.map