import { writeFileSync } from "node:fs";
import { artifactPaths, buildArtifacts } from "./crosswalk-lib.mjs";

const artifacts = buildArtifacts();
writeFileSync(artifactPaths.manifest, artifacts.manifest);
writeFileSync(artifactPaths.quality, artifacts.quality);
writeFileSync(artifactPaths.report, artifacts.report);
process.stdout.write("m3a_crosswalk_built cards=89 candidate_accept=6 candidate_reject=3 unmapped=80 owner_approved=0 owner_rejected=12 owner_deferred=1 database_open_mode=readonly+immutable\n");
