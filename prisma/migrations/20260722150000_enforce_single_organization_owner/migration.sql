CREATE UNIQUE INDEX "organization_memberships_single_owner_idx"
ON "organization_memberships"("organization_id")
WHERE "role" = 'owner'::"organization_role";
