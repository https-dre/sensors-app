import { createDrawerNavigator } from "@react-navigation/drawer";
import DrawWithGyroscope from './screens/DrawWithGyroscope';
import StepCounterScreen from "./screens/StepCounter";

const Drawer = createDrawerNavigator();

function Router() {
	return (
		<Drawer.Navigator>
			<Drawer.Screen name='Controle a bolinha!' component={DrawWithGyroscope}/>
			<Drawer.Screen name='Acelerômetro para Corridas!' component={StepCounterScreen} />
		</Drawer.Navigator>
	);
}

export default Router;