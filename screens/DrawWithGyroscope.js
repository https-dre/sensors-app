import React, { useEffect, useRef, useState } from "react";
import {
	View,
	StyleSheet,
	Dimensions,
	Text,
	TouchableOpacity,
} from "react-native";
import { GameEngine } from "react-native-game-engine";
import Matter from "matter-js";
import { Gyroscope } from "expo-sensors";

const { width, height } = Dimensions.get("window");

const Player = ({ body, size, color }) => {
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

const Obstacle = ({ body, size, color }) => {
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

const Physics = (entities, { time }) => {
	const engine = entities.physics.engine;

	// Atualiza a física normalmente
	Matter.Engine.update(engine, time.delta);

	// Força a posição Y fixa do jogador
	const { player } = entities;
	if (player && player.body) {
		const playerSize = player.size;
		const x = Math.max(
			playerSize / 2,
			Math.min(width - playerSize / 2, player.body.position.x)
		);
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
		const obstacles = Object.values(entities).filter(
			(e) => e.body && e.body.label === "obstacle"
		);

		obstacles.forEach((obstacle) => {
			if (Matter.Collision.collides(player.body, obstacle.body)) {
				dispatch({ type: "game-over" });
			}
		});
	}

	return entities;
};

const ObstacleGenerator = (entities, { dispatch, time }) => {
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

		const obstacle = Matter.Bodies.rectangle(
			Math.random() * (width - size.width) + size.width / 2,
			-size.height,
			size.width,
			size.height,
			{
				isStatic: false,
				label: "obstacle",
				restitution: 0.1,
				friction: 0.001,
				collisionFilter: {
					group: -1, // Isso permite que os obstáculos colidam entre si
				},
			}
		);

		// Aplica gravidade apenas aos obstáculos
		Matter.Body.set(obstacle, {
			gravityScale: 1, // 1 = gravidade normal, 0 = sem gravidade
		});

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

export default function PouLikeGame() {
	const engine = useRef(
		Matter.Engine.create({ enableSleeping: false })
	).current;
	const world = engine.world;
	const gameEngine = useRef(null);
	const [score, setScore] = useState(0);
	const [gameOver, setGameOver] = useState(false);
	const [started, setStarted] = useState(false);

	// Configuração das paredes (mais finas)
	const wallThickness = 20;
	const floor = Matter.Bodies.rectangle(
		width / 2,
		height + wallThickness / 2,
		width,
		wallThickness,
		{ isStatic: true }
	);
	const ceiling = Matter.Bodies.rectangle(
		width / 2,
		-wallThickness / 2,
		width,
		wallThickness,
		{ isStatic: true }
	);
	const leftWall = Matter.Bodies.rectangle(
		-wallThickness / 2,
		height / 2,
		wallThickness,
		height,
		{ isStatic: true }
	);
	const rightWall = Matter.Bodies.rectangle(
		width + wallThickness / 2,
		height / 2,
		wallThickness,
		height,
		{ isStatic: true }
	);

	// Configuração do jogador
	const playerSize = 50;
	const player = Matter.Bodies.circle(
		width / 2,
		height - 150, // Posição Y fixa
		playerSize / 2,
		{
			isStatic: false,
			label: "player",
			restitution: 0.1,
			friction: 0.01,
			frictionAir: 0.02,
			collisionFilter: {
				group: 0, // Grupo diferente dos obstáculos
			},
		}
	);

	useEffect(() => {
		if (started && !gameOver) {
			// Configuração inicial do mundo
			Matter.World.add(world, [floor, ceiling, leftWall, rightWall, player]);

			// Configuração do giroscópio
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

			// Configuração da gravidade do mundo
			world.gravity = {
				x: 0,
				y: 0.5, // Gravidade moderada para os obstáculos
				scale: 0.001,
			};

			// Sistema de pontuação
			const scoreInterval = setInterval(() => {
				setScore((prev) => prev + 1);
			}, 100);

			return () => {
				sub.remove();
				clearInterval(scoreInterval);
				Matter.World.clear(world, false);
			};
		}
	}, [started, gameOver]);

	const startGame = () => {
		setScore(0);
		setGameOver(false);
		setStarted(true);

		// Reinicia a posição do jogador
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
					<Text style={styles.titleText}>Desvie dos Obstáculos!</Text>
				)}
				<TouchableOpacity style={styles.startButton} onPress={startGame}>
					<Text style={styles.startButtonText}>
						{gameOver ? "Play Again" : "Start Game"}
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.scoreText}>Score: {score}</Text>
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
		marginTop: 20,
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
