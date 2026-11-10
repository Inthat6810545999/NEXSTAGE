// Illustrative end-stage layout. Coordinates are shared by the 2D map and 3D scene.
export const stage = { x: 0, z: -17, width: 28, depth: 8, height: 1.8 };
export const runway = { x: 0, z: -9, width: 3.6, depth: 8, height: 1.55 };
export const sectionColors = { Floor: '#a967ed', Lower: '#7953c7', Upper: '#b09ad5' };

export const sections = [
  { id: 'A', level: 'Floor', name: 'Front left', x: -6.4, z: -6, width: 8, depth: 9 },
  { id: 'B', level: 'Floor', name: 'Front right', x: 6.4, z: -6, width: 8, depth: 9 },
  { id: 'C', level: 'Floor', name: 'Rear left', x: -6.4, z: 5, width: 8, depth: 9 },
  { id: 'D', level: 'Floor', name: 'Rear right', x: 6.4, z: 5, width: 8, depth: 9 },
  { id: 'L1', level: 'Lower', name: 'Left · near stage', x: -15, z: -7, width: 9, depth: 5, yaw: -90 },
  { id: 'L2', level: 'Lower', name: 'Left · mid arena', x: -15, z: 4, width: 10, depth: 5, yaw: -90 },
  { id: 'L3', level: 'Lower', name: 'Rear left', x: -8.1, z: 14.3, width: 11, depth: 5, yaw: -25 },
  { id: 'L4', level: 'Lower', name: 'Rear right', x: 8.1, z: 14.3, width: 11, depth: 5, yaw: 25 },
  { id: 'L5', level: 'Lower', name: 'Right · mid arena', x: 15, z: 4, width: 10, depth: 5, yaw: 90 },
  { id: 'L6', level: 'Lower', name: 'Right · near stage', x: 15, z: -7, width: 9, depth: 5, yaw: 90 },
  { id: 'U1', level: 'Upper', name: 'Left balcony', x: -21.7, z: -5.5, width: 12, depth: 6, yaw: -90 },
  { id: 'U2', level: 'Upper', name: 'Left balcony · rear', x: -21.7, z: 8, width: 12, depth: 6, yaw: -90 },
  { id: 'U3', level: 'Upper', name: 'Rear balcony · left', x: -8.8, z: 21.5, width: 13, depth: 6, yaw: -19 },
  { id: 'U4', level: 'Upper', name: 'Rear balcony · right', x: 8.8, z: 21.5, width: 13, depth: 6, yaw: 19 },
  { id: 'U5', level: 'Upper', name: 'Right balcony · rear', x: 21.7, z: 8, width: 12, depth: 6, yaw: 90 },
  { id: 'U6', level: 'Upper', name: 'Right balcony', x: 21.7, z: -5.5, width: 12, depth: 6, yaw: 90 },
].map(section => {
  const floor = section.level === 'Floor';
  return {
    yaw: 0,
    rows: floor ? 9 : 6,
    seats: Math.floor(section.width / 0.84),
    base: { Floor: 0.10, Lower: 1.4, Upper: 4.65 }[section.level],
    rise: { Floor: 0, Lower: 0.35, Upper: 0.46 }[section.level],
    ...section,
  };
});

export function seatPosition(section, row, seat) {
  const localX = ((seat - 0.5) / section.seats - 0.5) * section.width;
  const localZ = ((row - 0.5) / section.rows - 0.5) * section.depth;
  const angle = section.yaw * Math.PI / 180;
  return {
    x: section.x + localX * Math.cos(angle) + localZ * Math.sin(angle),
    y: section.base + (row - 1) * section.rise,
    z: section.z - localX * Math.sin(angle) + localZ * Math.cos(angle),
  };
}
