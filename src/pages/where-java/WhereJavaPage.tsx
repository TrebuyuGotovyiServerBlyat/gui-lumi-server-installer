import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { Platform, platform } from "@tauri-apps/plugin-os";

import "./WhereJavaPage.css";
import { JavaConfig } from "../../types/java";
import LinuxInstructions from "../../components/LinuxInstructions/LinuxInstructions";
import WindowsInstructions from "../../components/WindowsInstructions/WindowsInstructions";
import { FaCog } from "react-icons/fa";
import { useNavigate } from "react-router-dom";


const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
};

const WhereJavaPage = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [userOS, setUserOS] = useState<Platform | null>(null);
	const [config, setConfig] = useState<JavaConfig | null>(null);


	useEffect(() => {
		const getPlatform = async () => {
			try {
				const osPlatform = await platform();
				setUserOS(osPlatform);
			} catch (e) {
				console.error("Failed to get platform:", e);
				setUserOS("windows");
			}
		};

		const getConfig = async () => {
			try {
				const response = await fetch("/config/java.json");
				const data = await response.json();
				setConfig(data);
			} catch (e) {
				console.error("Failed to fetch config:", e);
				setConfig({
					required_java_version: "21",
					windows_links: {
						adoptium: {
							url: "https://adoptium.net/temurin/releases/?version=21",
						},
					},
				});
			}
		};

		getPlatform();
		getConfig();
	}, []);

	if (!config || !userOS) {
		return (
			<div className="java-page-container">
				<div className="java-page-content">
					<p>{t("where_java.loading_config")}</p>
				</div>
			</div>
		);
	}

	const isErrorText = t("where_java.java_not_found", {
		version: config.required_java_version,
	});

	return (
		<div className="java-page-container">
			<button
				onClick={() => navigate("/settings")}
				className="settings-button"
				title={t("settings.title")}
			>
				<FaCog />
			</button>

			<motion.div
				className="java-page-content"
				initial="hidden"
				animate="visible"
				exit={{ opacity: 0, transition: { duration: 0.3 } }}
			>
				<motion.h1
					className="title-java-page"
					variants={itemVariants}
					transition={{ duration: 0.2 }}
				>
					{t("where_java.title")}
				</motion.h1>

				<motion.p
					className="subtitle-java-page"
					variants={itemVariants}
					transition={{ duration: 0.2, delay: 0.1 }}
				>
					{isErrorText}
				</motion.p>

				<motion.div
					className="instructions-wrapper"
					variants={itemVariants}
					transition={{ duration: 0.2, delay: 0.2 }}
				>
					{userOS === "linux" ? (
						<>
							<LinuxInstructions />
							<WindowsInstructions config={config} />
						</>
					) : (
						<>
							<WindowsInstructions config={config} />
							<LinuxInstructions />
						</>
					)}
				</motion.div>

			</motion.div>
		</div>
	);
};

export default WhereJavaPage;