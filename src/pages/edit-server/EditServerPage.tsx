import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FaSave, FaArrowLeft, FaTrash, FaServer, FaMemory, FaMicrochip } from "react-icons/fa";
import { invoke } from "@tauri-apps/api/core";

import { getSavedServers, updateSavedServer, removeSavedServer } from "../../utils/storeServers";
import { SavedServer, ScanResult } from "../../types/server";
import { DeleteServerModal } from "../../components/DeleteServerModal/DeleteServerModal";
import "./EditServerPage.css";

const parseMemoryToGb = (memStr: string): number => {
	if (!memStr) return 2;
	const match = memStr.match(/(\d+)([MG])/i);
	if (!match) return 2;

	const value = parseInt(match[1], 10);
	const unit = match[2].toUpperCase();

	if (unit === "M") return Math.round(value / 1024 * 10) / 10;
	return value;
};

const EditServerPage = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const { t } = useTranslation();

	const [server, setServer] = useState<SavedServer | null>(null);
	const [availableJars, setAvailableJars] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);

	const [name, setName] = useState("");
	const [memoryGb, setMemoryGb] = useState<number>(2);
	const [coreJar, setCoreJar] = useState("");
	const [systemTotalRam, setSystemTotalRam] = useState<number>(16);

	const [showDeleteModal, setShowDeleteModal] = useState(false);

	useEffect(() => {
		const loadData = async () => {
			try {
				const totalBytes = await invoke<number>("get_total_memory");
				const totalGb = Math.floor(totalBytes / (1024 * 1024 * 1024));
				setSystemTotalRam(totalGb > 0 ? totalGb : 8);
			} catch (e) {
				console.error("Failed to get system memory:", e);
			}

			if (!id) return;
			const servers = await getSavedServers();
			const found = servers.find(s => s.id === id);

			if (found) {
				setServer(found);
				setName(found.name);
				setMemoryGb(parseMemoryToGb(found.xmx));
				setCoreJar(found.coreJar);

				try {
					const result: ScanResult = await invoke("scan_server_folder", { serverPath: found.path });
					if (result.status === "Valid" || result.status === "NeedCoreSelection") {
						setAvailableJars(result.data.jars);
					}
				} catch (e) {
					console.error("Failed to scan jars:", e);
				}
			} else {
				navigate("/welcome");
			}
			setLoading(false);
		};
		loadData();
	}, [id, navigate]);

	const handleSave = async () => {
		if (!server) return;
		const memString = `${memoryGb}G`;

		try {
			await updateSavedServer({
				...server,
				name,
				xmx: memString,
				xms: memString,
				coreJar
			});
			navigate("/welcome");
		} catch (e) {
			console.error("Save failed", e);
		}
	};

	const handleDelete = async () => {
		if (!server) return;
		try {
			await removeSavedServer(server.id);
			navigate("/welcome");
		} catch (e) {
			console.error("Delete failed", e);
		}
	};

	if (loading) return null;
	if (!server) return null;

	return (
		<motion.div
			className="edit-page"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			<button className="nav-btn-back-corner" onClick={() => navigate("/welcome")}>
				<FaArrowLeft />
			</button>

			<div className="edit-container-simple">
				<div className="edit-header-simple">
					<h2>{t("edit_server.title")}</h2>
				</div>

				<div className="edit-content-scroll-simple">
					<div className="edit-section-simple">
						<div className="section-title-simple">
							<FaServer className="section-icon" />
							<span>{t("edit_server.general")}</span>
						</div>

						<div className="input-group">
							<label>{t("edit_server.server_name")}</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="styled-input"
								placeholder={t("edit_server.placeholder_name", "My Minecraft Server")}
							/>
						</div>

						<div className="input-group read-only">
							<label>{t("edit_server.path")}</label>
							<input type="text" value={server.path} disabled className="styled-input disabled" />
						</div>
					</div>

					<div className="edit-section-simple">
						<div className="section-title-simple">
							<FaMicrochip className="section-icon" />
							<span>{t("edit_server.core")}</span>
						</div>
						<div className="input-group">
							<label>{t("edit_server.select_jar")}</label>
							<select
								value={coreJar}
								onChange={(e) => setCoreJar(e.target.value)}
								className="styled-select"
							>
								{availableJars.map(jar => (
									<option key={jar} value={jar}>{jar}</option>
								))}
							</select>
						</div>
					</div>

					<div className="edit-section-simple">
						<div className="section-title-simple">
							<FaMemory className="section-icon" />
							<span>{t("edit_server.memory")}</span>
						</div>

						<div className="memory-slider-container">
							<div className="memory-display-simple">
								<span className="memory-value-simple">{memoryGb} GB</span>
								<span className="memory-total-simple">
									{t("edit_server.memory_from", { total: systemTotalRam })}
								</span>
							</div>

							<input
								type="range"
								min="1"
								max={systemTotalRam}
								step="0.5"
								value={memoryGb}
								onChange={(e) => setMemoryGb(parseFloat(e.target.value))}
								className="styled-range"
								style={{
									backgroundSize: `${((memoryGb - 1) * 100) / (systemTotalRam - 1)}% 100%`
								}}
							/>

							<div className="memory-limits">
								<span>1 GB</span>
								<span>{systemTotalRam} GB</span>
							</div>

							<p className="hint-text-simple">
								{t("edit_server.memory_hint_slider")}
							</p>
						</div>
					</div>
				</div>

				<div className="edit-actions-footer-simple">
					<button className="action-btn-simple delete" onClick={() => setShowDeleteModal(true)}>
						<FaTrash />
					</button>
					<div className="right-actions-simple">
						<button className="action-btn-simple cancel" onClick={() => navigate("/welcome")}>
							{t("common.cancel")}
						</button>
						<button className="action-btn-simple save" onClick={handleSave}>
							<FaSave /> {t("common.save")}
						</button>
					</div>
				</div>
			</div>

			<DeleteServerModal
				isOpen={showDeleteModal}
				serverName={name}
				onConfirm={handleDelete}
				onCancel={() => setShowDeleteModal(false)}
			/>
		</motion.div>
	);
};

export default EditServerPage;