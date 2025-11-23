import { motion } from "framer-motion";
import { FaServer, FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import "./CoreSelectorModal.css";

export const CoreSelectorModal = ({
	isOpen,
	jars,
	onSelect,
	onCancel,
}: {
	isOpen: boolean;
	jars: string[];
	onSelect: (jar: string) => void;
	onCancel: () => void;
}) => {
	const { t } = useTranslation();

	if (!isOpen) return null;

	return (
		<div className="core-modal-overlay" onClick={onCancel}>
			<motion.div
				className="core-modal-content"
				onClick={(e) => e.stopPropagation()}
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 0.95 }}
			>
				<div className="core-header">
					<div className="core-title-group">
						<FaServer className="core-main-icon" />
						<h3>{t("core_selector.title")}</h3>
					</div>
					<button className="core-close-btn" onClick={onCancel}>
						<FaTimes />
					</button>
				</div>

				<p className="core-description">
					{t("core_selector.description")}
				</p>

				<div className="core-list-container">
					{jars.map((jar) => (
						<button key={jar} className="core-item-btn" onClick={() => onSelect(jar)}>
							<span className="jar-name">{jar}</span>
						</button>
					))}
				</div>

				<div className="core-actions">
					<button className="core-cancel-btn" onClick={onCancel}>
						{t("common.cancel")}
					</button>
				</div>
			</motion.div>
		</div>
	);
};