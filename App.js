import { NavigationContainer } from '@react-navigation/native';
import Router from "./Drawer";

export default function App() {
	return (
		<NavigationContainer>
			<Router />
		</NavigationContainer>
	);
}
