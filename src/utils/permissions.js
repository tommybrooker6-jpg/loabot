function memberHasAnyRole(member, roleIds = []) {
  if (!roleIds || roleIds.length === 0) return false;
  return roleIds.some((id) => member.roles.cache.has(id));
}

module.exports = { memberHasAnyRole };
