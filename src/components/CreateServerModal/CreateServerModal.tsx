import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation, Trans } from "react-i18next";
import { addSavedServer } from "../../utils/storeServers";
import "./CreateServerModal.css";

interface CreateServerModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	onError: (msg: string) => void;
}

type Step = "select" | "fetching_github" | "downloading" | "setting_up" | "success";

export const CreateServerModal = ({ isOpen, onClose, onSuccess, onError }: CreateServerModalProps) => {
	const { t } = useTranslation();
	const [step, setStep] = useState<Step>("select");
	const [_, setServerPath] = useState<string | null>(null);
	const [downloadProgress, setDownloadProgress] = useState(0);

	const [validationError, setValidationError] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			setStep("select");
			setServerPath(null);
			setValidationError(null);
			setDownloadProgress(0);
		}
	}, [isOpen]);

	useEffect(() => {
		const unlisten = listen("download_progress", (event: any) => {
			const [downloaded, total] = event.payload;
			if (total > 0) {
				setDownloadProgress((downloaded / total) * 100);
			}
		});
		return () => { unlisten.then(f => f()); };
	}, []);

	const handleSelectFolder = async () => {
		setValidationError(null);
		try {
			const selected = await open({
				directory: true,
				multiple: false,
				title: t("create_server.select_folder_title")
			});

			if (selected && typeof selected === "string") {
				const isEmpty = await invoke<boolean>("is_dir_empty", { path: selected });

				if (!isEmpty) {
					setValidationError(t("create_server.error.not_empty"));
					return;
				}

				setServerPath(selected);
				startCreationProcess(selected);
			}
		} catch (e: any) {
			console.error(e);
		}
	};

	const startCreationProcess = async (path: string) => {
		try {
			setStep("fetching_github");

			const response = await fetch("https://api.github.com/repos/KoshakMineDEV/Lumi/releases/latest");
			if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);

			const data = await response.json();
			const asset = data.assets.find((a: any) => a.name.startsWith("Lumi") && a.name.endsWith(".jar"));

			if (!asset) throw new Error(t("create_server.error.broken_release"));

			const downloadUrl = asset.browser_download_url;
			const fileName = asset.name;
			const localFilePath = `${path}/${fileName}`;

			setStep("downloading");

			await invoke("download_file", { url: downloadUrl, path: localFilePath });

			setStep("setting_up");
			await new Promise(r => setTimeout(r, 500));

			await invoke("setup_lumi_server", { path: path, coreJar: fileName });

			const folderName = path.split(/[\\/]/).pop() || "Lumi Server";
			await addSavedServer(folderName, path, fileName);

			setStep("success");
		} catch (e: any) {
			console.error(e);
			const errorMsg = typeof e === "string" ? e : (e.message || JSON.stringify(e));
			onError(errorMsg);
		}
	};

	const overlayVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1 },
		exit: { opacity: 0 }
	};

	const modalVariants = {
		hidden: { opacity: 0, y: 50, scale: 0.95 },
		visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", duration: 0.5, bounce: 0.3 } },
		exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }
	};

	const renderContent = () => {
		if (step === "success") {
			return (
				<motion.div
					key="success"
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					className="modal-step-content"
				>
					<div className="create-modal-header">
						<h3 style={{ color: "var(--color-success-bright)" }}>
							{t("create_server.success.title")}
						</h3>
					</div>
					<p className="modal-body-text">
						{t("create_server.success.description")}
					</p>
					<div className="modal-actions">
						<button className="modal-btn success" onClick={() => {
							onClose();
							onSuccess();
						}}>
							{t("create_server.success.button")}
						</button>
					</div>
				</motion.div>
			);
		}

		if (step !== "select") {
			return (
				<motion.div
					key="process"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="modal-step-content"
				>
					<div className="create-modal-header">
						<h3>{t("create_server.process.title")}</h3>
					</div>

					<p className="modal-body-text">
						{step === "fetching_github" && t("create_server.process.fetching")}
						{step === "downloading" && t("create_server.process.downloading", { percent: Math.round(downloadProgress) })}
						{step === "setting_up" && t("create_server.process.setting_up")}
					</p>

					<div className="progress-wrapper">
						<div className="progress-container">
							<motion.div
								className="progress-bar"
								initial={{ width: 0 }}
								animate={{
									width: step === "fetching_github" ? "10%" :
										step === "setting_up" ? "100%" :
											`${downloadProgress}%`
								}}
								transition={{ type: "spring", stiffness: 50 }}
							/>
						</div>
						{step === "downloading" && (
							<motion.p
								initial={{ opacity: 0, y: 5 }}
								animate={{ opacity: 1, y: 0 }}
								className="tea-message"
							>
								{t("create_server.process.tea_message")}
							</motion.p>
						)}
					</div>
				</motion.div>
			);
		}

		return (
			<motion.div
				key="select"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="modal-step-content"
			>
				<div className="create-modal-header">
					<h3>{t("create_server.select.title")}</h3>
				</div>
				<p className="modal-body-text">
					{t("create_server.select.description_1")}
					<br />
					{t("create_server.select.description_2")}
				</p>

				<AnimatePresence>
					{validationError && (
						<motion.div
							className="validation-error-box"
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
						>
							{validationError}
						</motion.div>
					)}
				</AnimatePresence>

				<div className="modal-actions">
					<button className="modal-btn cancel" onClick={onClose}>
						{t("common.cancel")}
					</button>
					<button className="modal-btn confirm" onClick={handleSelectFolder}>
						{t("create_server.select.button_select")}
					</button>
				</div>
			</motion.div>
		);
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className="create-modal-overlay"
					variants={overlayVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
				>
					<motion.div
						className="create-modal-content"

						/** @ts-ignore */
						variants={modalVariants}

						onClick={(e) => e.stopPropagation()}
					>
						{renderContent()}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};