import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { GameEngine } from "react-native-game-engine";
import Matter from "matter-js";
import { Gyroscope } from "expo-sensors";

const { width, height } = Dimensions.get("window");

const Ball = ({ body, radius, color }) => {
	const x = body.position.x - radius;
	const y = body.position.y - radius;
	return (
		<View
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: radius * 2,
				height: radius * 2,
				borderRadius: radius,
				backgroundColor: color,
			}}
		/>
	);
};

const Physics = (entities, { time }) => {
	let engine = entities.physics.engine;
	Matter.Engine.update(engine, time.delta);
	return entities;
};

export default function DrawWithGyroscope() {
	const engine = useRef(
		Matter.Engine.create({ enableSleeping: false })
	).current;
	const world = engine.world;

	// cria a bolinha
	const ball = Matter.Bodies.circle(width / 2, height / 2, 25, {
		frictionAir: 0.05,
		restitution: 0.8,
	});

	// cria as paredes da tela
	const floor = Matter.Bodies.rectangle(width / 2, height, width, 50, {
		isStatic: true,
	});

	const ceiling = Matter.Bodies.rectangle(width / 2, -25, width, 50, {
		isStatic: true,
	});

	const leftWall = Matter.Bodies.rectangle(-25, height / 2, 50, height, {
		isStatic: true,
	});

	const rightWall = Matter.Bodies.rectangle(
		width + 25,
		height / 2,
		50,
		height,
		{ isStatic: true }
	);

	useEffect(() => {
		Matter.World.add(world, [ball, floor, ceiling, leftWall, rightWall]);

		Gyroscope.setUpdateInterval(16);
		const sub = Gyroscope.addListener(({ x, y }) => {
			// aqui deve atualizar a gravidade com base na inclinação do dispositivo
			world.gravity.x = y * 2; // invertido
			world.gravity.y = -x * 2;
		});

		return () => {
			sub.remove();
		};
	}, []);

	return (
		<GameEngine
			systems={[Physics]}
			entities={{
				physics: { engine, world },
				ball: { body: ball, radius: 25, color: "white", renderer: Ball },
			}}
			style={styles.container}
		/>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#64c471",
	},
});
