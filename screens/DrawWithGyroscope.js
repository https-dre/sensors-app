import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from "react-native";
import { GameEngine } from "react-native-game-engine";
import Matter from "matter-js";
import { Gyroscope } from "expo-sensors";
import { Player, ObstacleGenerator } from "../components/GameComponents";

const { width, height } = Dimensions.get("window");

const Physics = (entities, { time }) => {
	const engine = entities.physics.engine;

	Matter.Engine.update(engine, time.delta);

	// tenta forçar a posição Y fixa do jogador
	const { player } = entities;
	if (player && player.body) {
		const playerSize = player.size;
		const x = Math.max(playerSize / 2, Math.min(width - playerSize / 2, player.body.position.x));
		const y = height - 150; // Posição Y fixa

		Matter.Body.setPosition(player.body, { x, y });
		Matter.Body.setVelocity(player.body, {
			x: player.body.velocity.x,
			y: 0, // Velocidade Y sempre zero
		});
	}

	return entities;
};

const GameSystem = (entities, { dispatch, time }) => {
	const { player } = entities;

	if (player && player.body) {
		const obstacles = Object.values(entities).filter((e) => e.body && e.body.label === "obstacle");

		obstacles.forEach((obstacle) => {
			if (Matter.Collision.collides(player.body, obstacle.body)) {
				dispatch({ type: "game-over" });
			}
		});
	}

	return entities;
};

export default function Game() {
	const engine = useRef(Matter.Engine.create({ enableSleeping: false })).current;
	const world = engine.world;
	const gameEngine = useRef(null);
	const [score, setScore] = useState(0);
	const [gameOver, setGameOver] = useState(false);
	const [started, setStarted] = useState(false);
	const [gravity, setGravity] = useState(1);

	const wallThickness = 20;
	const floor = Matter.Bodies.rectangle(
		width / 2,
		height + wallThickness / 2,
		width,
		wallThickness,
		{ isStatic: true }
	);

	const leftWall = Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, {
		isStatic: true,
	});
	const rightWall = Matter.Bodies.rectangle(
		width + wallThickness / 2,
		height / 2,
		wallThickness,
		height,
		{ isStatic: true }
	);

	// jogador
	const playerSize = 50;
	const player = Matter.Bodies.circle(width / 2, height - 150, playerSize / 2, {
		isStatic: false,
		label: "player",
		restitution: 0.1,
		friction: 0.01,
		frictionAir: 0.02,
		collisionFilter: {
			group: 0,
		},
	});

	useEffect(() => {
		if (started && !gameOver) {
			Matter.World.add(world, [floor, leftWall, rightWall, player]);

			Gyroscope.setUpdateInterval(16);
			const sub = Gyroscope.addListener(({ x, y, z }) => {
				if (player) {
					// Movimento apenas no eixo X
					Matter.Body.setVelocity(player, {
						x: -z * 10,
						y: 0, // Sem movimento vertical
					});
				}
			});

			world.gravity.x = 0;
			world.gravity.y = gravity; // gravidade padrão
			world.gravity.scale = 0.001;

			const scoreInterval = setInterval(() => {
				setScore((prev) => prev + 1);
			}, 100);

			const gravityInterval = setInterval(() => {
				setGravity((prev) => prev + 0.02);
			}, 1000)

			return () => {
				sub.remove();
				clearInterval(scoreInterval);
				clearInterval(gravityInterval)
				Matter.World.clear(world, false);
			};
		}
	}, [started, gameOver]);

	const startGame = () => {
		setScore(0);
		setGravity(1);
		setGameOver(false);
		setStarted(true);

		if (player) {
			Matter.Body.setPosition(player, { x: width / 2, y: height - 150 });
			Matter.Body.setVelocity(player, { x: 0, y: 0 });
		}
	};

	const onEvent = (e) => {
		if (e.type === "game-over") {
			setGameOver(true);
			setStarted(false);
		}
	};

	if (!started) {
		return (
			<View style={styles.container}>
				{gameOver ? (
					<>
						<Text style={styles.gameOverText}>Game Over!</Text>
						<Text style={styles.scoreText}>Score: {score}</Text>
					</>
				) : (
					<View style={{ justifyContent: 'center', paddingHorizontal: 50, flexDirection: 'column' }}>
						<Text style={styles.titleText}>Desvie dos Obstáculos!</Text>
						<Text>Antes de Iniciar, certique-se de manter o celular alinhado para calibrar os sensores!</Text>
					</View>
				)}
				<TouchableOpacity style={styles.startButton} onPress={startGame}>
					<Text style={styles.startButtonText}>{gameOver ? "Play Again" : "Start Game"}</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.scoreText}>Score: {score}</Text>
			<Text style={styles.scoreText}>Gravity: {Number(gravity.toFixed(2))}</Text>
			<GameEngine
				ref={gameEngine}
				systems={[Physics, GameSystem, ObstacleGenerator]}
				entities={{
					physics: { engine, world },
					player: {
						body: player,
						size: playerSize,
						color: "#8a2be2",
						renderer: Player,
					},
				}}
				onEvent={onEvent}
				style={styles.gameContainer}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f0f8ff",
		alignItems: "center",
		justifyContent: "center",
	},
	gameContainer: {
		flex: 1,
		width: "100%",
	},
	titleText: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		color: "#333",
	},
	gameOverText: {
		fontSize: 32,
		fontWeight: "bold",
		marginBottom: 20,
		color: "#ff4500",
	},
	scoreText: {
		fontSize: 20,
		fontWeight: "bold",
		marginTop: 5,
		color: "#333",
	},
	startButton: {
		backgroundColor: "#4CAF50",
		paddingHorizontal: 30,
		paddingVertical: 15,
		borderRadius: 25,
		marginTop: 20,
	},
	startButtonText: {
		color: "white",
		fontSize: 18,
		fontWeight: "bold",
	},
});
