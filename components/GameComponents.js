import { View, Dimensions } from 'react-native';
import Matter from 'matter-js';

const { width, height } = Dimensions.get("window");

export const Player = ({ body, size, color }) => {
	const x = body.position.x - size / 2;
	const y = body.position.y - size / 2;
	return (
		<View
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: size,
				height: size,
				borderRadius: size / 2,
				backgroundColor: color,
				borderWidth: 2,
				borderColor: "#fff",
			}}
		/>
	);
};

export const Obstacle = ({ body, size, color }) => {
	const x = body.position.x - size.width / 2;
	const y = body.position.y - size.height / 2;
	return (
		<View
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: size.width,
				height: size.height,
				backgroundColor: color,
				borderRadius: size.width / 4,
			}}
		/>
	);
};

export const ObstacleGenerator = (entities, { dispatch, time }) => {
	const { physics } = entities;
	const world = physics.world;

	if (
		!entities.lastObstacleTime ||
		time.current - entities.lastObstacleTime > 1000
	) {
		const size = {
			width: 30 + Math.random() * 40,
			height: 30 + Math.random() * 40,
		};

		const spawnY = 0 + size.height / 2 + 1; // Um pouco abaixo da parede superior

		const obstacle = Matter.Bodies.rectangle(
			Math.random() * (width - size.width) + size.width / 2,
			spawnY,
			size.width,
			size.height,
			{
				isStatic: false,
				label: "obstacle",
				restitution: 0.1,
				friction: 0.001,
				frictionAir: 0.01,
				collisionFilter: {
					group: -1, // Isso permite que os obstáculos colidam entre si
				},
			}
		);

		Matter.World.add(world, obstacle);

		entities[`obstacle_${Date.now()}`] = {
			body: obstacle,
			size,
			color: `hsl(${Math.random() * 360}, 70%, 50%)`,
			renderer: Obstacle,
		};

		entities.lastObstacleTime = time.current;
	}

	// Remove obstáculos que saíram da tela
	Object.keys(entities).forEach((key) => {
		if (key.startsWith("obstacle_")) {
			const obstacle = entities[key];
			if (
				obstacle &&
				obstacle.body &&
				obstacle.body.position.y > height + 100
			) {
				Matter.World.remove(world, obstacle.body);
				delete entities[key];
			}
		}
	});

	return entities;
};