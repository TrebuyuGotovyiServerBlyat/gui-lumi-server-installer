import { LazyStore } from "@tauri-apps/plugin-store";
import { v4 as uuidv4 } from "uuid";
import i18next from "../lib/i18n";
import { SavedServer } from "../types/server";

const SERVERS_KEY = "servers_list";
const store = new LazyStore("servers.json");

export const getSavedServers = async (): Promise<SavedServer[]> => {
	try {
		const servers = await store.get<SavedServer[]>(SERVERS_KEY);
		return (servers || []).map(s => ({
			...s,
			xmx: s.xmx || "2G",
			xms: s.xms || "2G"
		}));
	} catch (error) {
		console.error("Failed to load servers store:", error);
		return [];
	}
};

export const addSavedServer = async (name: string, path: string, coreJar: string): Promise<SavedServer> => {
	const current = await getSavedServers();

	const exists = current.find(s => s.path === path);
	if (exists) throw new Error(i18next.t("errors.server_exists"));

	const newServer: SavedServer = {
		id: uuidv4(),
		name: name || i18next.t("dashboard.default_new_server"),
		path,
		coreJar,
		xmx: "2G",
		xms: "2G"
	};

	try {
		await store.set(SERVERS_KEY, [...current, newServer]);
		await store.save();
	} catch (error) {
		console.error("Failed to save store:", error);
		throw new Error(i18next.t("errors.save_failed"));
	}

	return newServer;
};

export const updateSavedServer = async (updatedServer: SavedServer) => {
	const current = await getSavedServers();
	const index = current.findIndex(s => s.id === updatedServer.id);

	if (index === -1) throw new Error("Server not found");

	const newServers = [...current];
	newServers[index] = updatedServer;

	try {
		await store.set(SERVERS_KEY, newServers);
		await store.save();
	} catch (error) {
		console.error("Failed to save store update:", error);
		throw new Error(i18next.t("errors.save_failed"));
	}
};

export const removeSavedServer = async (id: string) => {
	const current = await getSavedServers();
	const filtered = current.filter((s) => s.id !== id);

	try {
		await store.set(SERVERS_KEY, filtered);
		await store.save();
	} catch (error) {
		console.error("Failed to save store after removal:", error);
		throw new Error(i18next.t("errors.save_failed"));
	}
};