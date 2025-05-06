import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Animated } from "react-native";
import { Accelerometer } from "expo-sensors";

export default function RaceAccelerometer() {
	const [data, setData] = useState({ x: 0, y: 0, z: 0 });
	const [speed, setSpeed] = useState(0);
	const barAnim = useState(new Animated.Value(0))[0];

	useEffect(() => {
		const subscription = Accelerometer.addListener((accData) => {
			setData(accData);
			const accel = Math.sqrt(accData.x ** 2 + accData.y ** 2 + accData.z ** 2);
			const gForce = Math.max(0, accel - 1); // remover gravidade
			const fakeSpeed = Math.min(gForce * 100, 300); // escala até 300 km/h
			setSpeed(Math.round(fakeSpeed));

			// anima a barrinha
			Animated.timing(barAnim, {
				toValue: fakeSpeed,
				duration: 100,
				useNativeDriver: false,
			}).start();
		});

		Accelerometer.setUpdateInterval(100);

		return () => subscription.remove();
	}, []);

	const barWidth = barAnim.interpolate({
		inputRange: [0, 300],
		outputRange: ["0%", "100%"],
		extrapolate: "clamp",
	});

	return (
		<View style={styles.container}>
			<Text style={styles.title}>🏁 Acelerômetro de Corrida</Text>
			<Text style={styles.speedText}>{speed} km/h</Text>

			<View style={styles.barContainer}>
				<Animated.View style={[styles.barFill, { width: barWidth }]} />
			</View>

			<Text style={styles.gForce}>
				G-Force:{" "}
				{(Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2) - 1).toFixed(2)}g
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#111",
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
	},
	title: {
		fontSize: 28,
		color: "#fff",
		marginBottom: 40,
	},
	speedText: {
		fontSize: 48,
		fontWeight: "bold",
		color: "#0f0",
		marginBottom: 20,
	},
	barContainer: {
		width: "100%",
		height: 20,
		backgroundColor: "#444",
		borderRadius: 10,
		overflow: "hidden",
		marginBottom: 30,
	},
	barFill: {
		height: "100%",
		backgroundColor: "#0f0",
	},
	gForce: {
		fontSize: 20,
		color: "#ccc",
		marginTop: 10,
	},
});
