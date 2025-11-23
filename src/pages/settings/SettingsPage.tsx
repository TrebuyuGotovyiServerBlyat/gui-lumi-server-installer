import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	getLanguage,
	changeLanguage,
	setAppScale
} from "../../utils/storeSettings";
import {
	SettingsPageProps,
	SupportedLanguage,
	supportedLanguage,
} from "../../types/settings";
import { FaArrowLeft, FaChevronDown } from "react-icons/fa";
import "./SettingsPage.css";

const SettingsPage = ({ currentScale, onScaleChange }: SettingsPageProps) => {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const [currentLang, setCurrentLang] = useState<SupportedLanguage>("en");
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const loadLang = async () => {
			const lang = await getLanguage();
			setCurrentLang(lang);
		};
		loadLang();
	}, []);

	const handleOptionClick = async (newLang: SupportedLanguage) => {
		await changeLanguage(newLang);
		await i18n.changeLanguage(newLang);
		setCurrentLang(newLang);
		setIsOpen(false);
	};

	const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newScale = Number(e.target.value);
		onScaleChange(newScale);
	};

	const handleScaleSave = async () => {
		await setAppScale(currentScale);
	};

	return (
		<motion.div
			className="settings-container"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.3 }}
		>
			<button className="back-button" onClick={() => navigate(-1)}>
				<FaArrowLeft />
			</button>

			<div className="settings-content-wrapper">
				<motion.h1
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.1 }}
				>
					{t("settings.title")}
				</motion.h1>

				<motion.div
					className="settings-content"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.2 }}
				>
					<div className="settings-option">
						<label htmlFor="language-select">
							{t("settings.language")}
						</label>
						<div className="custom-select-container">
							<div
								className="custom-select-trigger"
								onClick={() => setIsOpen(!isOpen)}
							>
								<span>{t(`language`, { lng: currentLang })}</span>
								<FaChevronDown
									className={`chevron-icon ${isOpen ? "open" : ""}`}
								/>
							</div>

							<AnimatePresence>
								{isOpen && (
									<motion.div
										className="custom-select-menu"
										initial={{ opacity: 0, y: -10, scale: 0.95 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: -10, scale: 0.95 }}
										transition={{ duration: 0.2, ease: "easeOut" }}
									>
										{supportedLanguage.map((lang) => (
											<div
												key={lang}
												className={`custom-select-option ${currentLang === lang ? "selected" : ""
													}`}
												onClick={() => handleOptionClick(lang)}
											>
												{t(`language`, { lng: lang })}
											</div>
										))}
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>

					<div className="settings-option">
						<label htmlFor="scale-slider">{t("settings.scale")}</label>

						<div className="scale-slider-container">
							<input
								type="range"
								id="scale-slider"
								className="scale-slider"
								min={0.8}
								max={1.5}
								step={0.05}
								value={currentScale}
								onChange={handleScaleChange}
								onMouseUp={handleScaleSave}
								onTouchEnd={handleScaleSave}
							/>
							<span className="scale-value">
								{Math.round(currentScale * 100)}%
							</span>
						</div>
					</div>
				</motion.div>
			</div>
		</motion.div>
	);
};

export default SettingsPage;