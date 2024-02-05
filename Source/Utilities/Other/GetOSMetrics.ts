import { OSMetrics } from "@Typings/Utilities/Generic.js";
import DurHumanizer from "humanize-duration";
import Convert from "convert-units";
import Process from "node:process";
import OSUtils from "node-os-utils";
import OS from "node:os";

type MData<HR extends boolean = false> = OSMetrics.OSMetricsData<HR>;
const HumanizeDuration = DurHumanizer.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

export default async function GetOSMetrics<Readable extends boolean = false>(
  HumanReadable: Readable
): Promise<MData<Readable>> {
  const PUptime = HumanReadable ? HumanizeDuration(Process.uptime() * 1000) : Process.uptime();
  return {
    node_ver: Process.version.slice(1),
    process_uptime: PUptime as any,

    cpu: await GetCPUDetails(),
    system: GetSysDetails(HumanReadable),
    memory: GetMemoryDetails("MB", HumanReadable),
  };
}

// -----------------------------------------------------------------------------
// Helpers:
// --------
/**
 * Returns system details such as type, uptime, version, and platform, with an option to return human-readable values.
 * @param {Readable} HR - Stands for "human readable".
 * @returns
 */
function GetSysDetails<Readable extends boolean = false>(HR: Readable): MData<Readable>["system"] {
  if (global.gc) global.gc();
  if (HR) {
    return {
      type: OS.type(),
      uptime: HumanizeDuration(OS.uptime() * 1000) as any,
      version: OS.version(),
      platform: OS.platform() as any,
    };
  } else {
    return {
      type: OS.type(),
      uptime: OS.uptime() as any,
      version: OS.version(),
      platform: OS.platform() as any,
    };
  }
}

/**
 * Get memory details.
 * @param Unit - The unit of measurement.
 * @param HR - Whether to display in human-readable format.
 * @returns Memory details.
 */
function GetMemoryDetails<Readable extends boolean = false>(
  Unit: Convert.Unit,
  HR: Readable
): MData<Readable>["memory"] {
  const MemoryDetails: Record<keyof MData["memory"], number | string> = {
    total: Math.round(Convert(OS.totalmem()).from("B").to(Unit)),
    free: Math.round(Convert(OS.freemem()).from("B").to(Unit)),
    rss: Math.round(Convert(Process.memoryUsage.rss()).from("B").to(Unit)),
    used: Math.round(
      Convert(OS.totalmem() - OS.freemem())
        .from("B")
        .to(Unit)
    ),
  };

  if (HR) {
    for (const [K, V] of Object.entries(MemoryDetails)) {
      MemoryDetails[K] = `${V} ${Unit}`;
    }
  }

  return MemoryDetails as MData<Readable>["memory"];
}

/**
 * Basic CPU details.
 * @returns
 */
async function GetCPUDetails(): Promise<MData["cpu"]> {
  return {
    model: OSUtils.cpu.model(),
    utilization: await OSUtils.cpu.usage(),
  };
}
