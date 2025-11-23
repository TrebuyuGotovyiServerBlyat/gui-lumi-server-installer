import React, { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ServerItemProps } from "../../types/server";
import { parseMotd } from "../../utils/minecraftFormatter";
import { FaPencilAlt, FaPlay, FaStop, FaSpinner, FaBan, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import "./ServerItem.css";

const ServerItemComponent = ({ server, isRunning, isLoading, isExternal, onToggle, onDelete, onEdit }: ServerItemProps) => {
	const { t } = useTranslation();
	const { name, status, path, settings, errorMessage } = server;

	const serverName =
		name === "default.server_name"
			? t("dashboard.default_server_name", "Lumi Server")
			: name;

	const motdNodes = useMemo(() => {
		return parseMotd(settings.motd);
	}, [settings.motd]);

	const isError = status === "error";

	const handleEditClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onEdit) onEdit();
	};

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onDelete) onDelete();
	};

	const handleToggleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!isExternal && !isError) {
			onToggle();
		}
	};

	let buttonContent;
	let buttonTitle;

	if (isLoading) {
		buttonContent = <FaSpinner className="icon-spin" />;
		buttonTitle = t("dashboard.loading");
	} else if (isError) {
		buttonContent = null;
		buttonTitle = "";
	} else if (isExternal) {
		buttonContent = <><FaBan /> {t("dashboard.external")}</>;
		buttonTitle = t("dashboard.external_tooltip", "Запущен вне лаунчера (PID неизвестен)");
	} else if (isRunning) {
		buttonContent = <><FaStop /> {t("dashboard.kill_action")}</>;
		buttonTitle = t("dashboard.stop_server", "Stop Server");
	} else {
		buttonContent = <><FaPlay /> {t("dashboard.start_action")}</>;
		buttonTitle = t("dashboard.start_server", "Start Server");
	}

	return (
		<div className={`server-item ${isRunning ? "running-border" : ""} ${isError ? "error-border" : ""}`}>
			<div className="server-info">
				<h3 className="server-name">
					<div
						className={`status-indicator ${status}`}
						title={t(`dashboard.status.${status}`, status)}
					/>
					<span>{serverName}</span>
				</h3>

				<p className="server-path" title={path}>{path}</p>

				{isError ? (
					<div className="server-error-message" title={errorMessage}>
						<FaExclamationTriangle style={{ marginRight: "6px" }} />
						{errorMessage || t("errors.unknown_error", "Неизвестная ошибка")}
					</div>
				) : (
					<div className="server-settings">
						<span className="setting-item motd-item">
							<label>{t("dashboard.label_motd", "MOTD")}:</label>
							<span className="motd-container">{motdNodes}</span>
						</span>
						<span className="setting-separator">|</span>
						<span className="setting-item">
							<label>{t("dashboard.label_port", "Port")}:</label>
							<span>{settings["server-port"]}</span>
						</span>
						<span className="setting-separator">|</span>
						<span className="setting-item">
							<label>{t("dashboard.label_players", "Players")}:</label>
							<span>{settings["max-players"]}</span>
						</span>
					</div>
				)}
			</div>

			<div className="server-actions">
				{!isError && (
					<button
						className={`toggle-btn ${isRunning ? "stop" : "start"} ${isExternal ? "disabled" : ""}`}
						onClick={handleToggleClick}
						disabled={isLoading || isExternal}
						title={buttonTitle}
					>
						{buttonContent}
					</button>
				)}

				{isError ? (
					<button
						className="server-delete-button"
						title={t("dashboard.delete_server")}
						onClick={handleDeleteClick}
					>
						<FaTrash />
					</button>
				) : (
					<button
						className={`server-edit-button ${isRunning ? "disabled" : ""}`}
						title={t("dashboard.edit_server_title")}
						onClick={handleEditClick}
						disabled={isRunning || isExternal || isLoading}
					>
						<FaPencilAlt />
					</button>
				)}
			</div>
		</div>
	);
};

const arePropsEqual = (prev: ServerItemProps, next: ServerItemProps) => {
	return (
		prev.isRunning === next.isRunning &&
		prev.isLoading === next.isLoading &&
		prev.isExternal === next.isExternal &&
		prev.server.status === next.server.status &&
		prev.server.name === next.server.name &&
		prev.server.path === next.server.path &&
		prev.server.errorMessage === next.server.errorMessage &&
		JSON.stringify(prev.server.settings) === JSON.stringify(next.server.settings)
	);
};

export default memo(ServerItemComponent, arePropsEqual);