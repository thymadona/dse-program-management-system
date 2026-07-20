import type { Router } from "express";
import type { DSEPlugin, PluginManifest } from "@dse-pms/shared-types";

/**
 * In-process plugin registry. Plugins register their manifest + Express router
 * + public service here. Cross-plugin calls go through `registry.get(id).service`
 * — the in-process equivalent of an API call — never a direct internal import.
 */

/** Concrete backend plugin: router is a real Express Router. */
export interface BackendPlugin<TService = unknown> extends DSEPlugin<TService> {
  router: Router;
}

class PluginRegistry {
  private readonly plugins = new Map<string, BackendPlugin>();

  register(plugin: BackendPlugin): void {
    if (this.plugins.has(plugin.manifest.id)) {
      throw new Error(`Plugin already registered: ${plugin.manifest.id}`);
    }
    this.plugins.set(plugin.manifest.id, plugin);
  }

  /** Fetch a plugin (typed) for cross-plugin service access. */
  get<TService = unknown>(id: string): BackendPlugin<TService> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin not found in registry: ${id}`);
    }
    return plugin as BackendPlugin<TService>;
  }

  has(id: string): boolean {
    return this.plugins.has(id);
  }

  all(): BackendPlugin[] {
    return [...this.plugins.values()];
  }

  /** Manifests only — safe to expose over HTTP for nav/introspection. */
  manifests(): PluginManifest[] {
    return this.all().map((p) => p.manifest);
  }
}

export const registry = new PluginRegistry();
