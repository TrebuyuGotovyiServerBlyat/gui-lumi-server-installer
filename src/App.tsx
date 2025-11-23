import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

import SplashScreen from "./pages/splash/SplashScreen";
import DashboardPage from "./pages/dashboard/DashboardPage";
import WhereJavaPage from "./pages/where-java/WhereJavaPage";
import { JavaCheckResult } from "./types/java";
import CheckingPage from "./pages/checking/CheckingPage";
import SettingsPage from "./pages/settings/SettingsPage";
import { getAppScale } from "./utils/storeSettings";

import "./App.css";
import EditServerPage from "./pages/edit-server/EditServerPage";

const ZoomWrapper: React.FC<{
	children: React.ReactNode;
	scale: number;
	motionKey: string;
}> = ({ children, scale, motionKey }) => (
	<motion.div
		key={motionKey}
		style={{ zoom: scale, height: "100%", width: "100%" }}
		initial={{ opacity: 0 }}
		animate={{ opacity: 1 }}
		exit={{ opacity: 0, transition: { duration: 0.3 } }}
		transition={{ duration: 0.6, ease: "easeOut" }}
	>
		{children}
	</motion.div>
);


function App() {
	const [showSplash, setShowSplash] = useState(true);
	const [appScale, setAppScale] = useState(1);
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		const loadScale = async () => {
			const scale = await getAppScale();
			setAppScale(scale);
		};
		loadScale();
	}, []);

	const onSplashFinish = () => {
		setShowSplash(false);
		navigate("/checking");
	};

	useEffect(() => {
		if (!showSplash && location.pathname === "/checking") {
			const timer = setTimeout(() => {
				checkJava();
			}, 100);

			return () => clearTimeout(timer);
		}
	}, [showSplash, location.pathname, navigate]);

	const checkJava = async () => {
		try {
			const response = await fetch("/config/java.json");
			const config = await response.json();
			const requiredVersion = config.required_java_version || "21";

			const result: JavaCheckResult = await invoke("check_java_version", {
				requiredVersionStr: requiredVersion,
			});

			if (result.is_compatible) {
				navigate("/welcome");
			} else {
				navigate("/java-missing");
			}
		} catch (err) {
			console.error("Не удалось проверить Java или загрузить конфиг:", err);
			navigate("/java-missing");
		}
	};

	return (
		<AnimatePresence mode="wait">
			{showSplash ? (
				<SplashScreen key="splash" onFinish={onSplashFinish} />
			) : (
				<motion.div
					key="app"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.6, ease: "easeOut" }}
					style={{ width: "100%", height: "100%" }}
				>
					<div className="global-glow-bg sphere1"></div>
					<div className="global-glow-bg sphere2"></div>

					<AnimatePresence mode="wait">
						<Routes location={location} key={location.pathname}>
							<Route path="/checking" element={<CheckingPage />} />
							<Route path="*" element={<CheckingPage />} />

							<Route
								path="/java-missing"
								element={
									<ZoomWrapper scale={appScale} motionKey="java-page">
										<WhereJavaPage />
									</ZoomWrapper>
								}
							/>
							<Route
								path="/welcome"
								element={
									<ZoomWrapper scale={appScale} motionKey="welcome-page">
										<DashboardPage />
									</ZoomWrapper>
								}
							/>
							<Route
								path="/settings"
								element={
									<ZoomWrapper scale={appScale} motionKey="settings-page">
										<SettingsPage
											currentScale={appScale}
											onScaleChange={setAppScale}
										/>
									</ZoomWrapper>
								}
							/>
							<Route
								path="/edit-server/:id"
								element={
									<ZoomWrapper scale={appScale} motionKey="edit-page">
										<EditServerPage />
									</ZoomWrapper>
								}
							/>
						</Routes>
					</AnimatePresence>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

export default App;