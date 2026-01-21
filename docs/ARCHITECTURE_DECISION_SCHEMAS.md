# Architecture Decision: Schema Segregation vs. Tenant ID

## Current Approach: Separate Schemas Per Client

### ✅ Advantages

1. **Cost-Effective**
   - Single Supabase project (one subscription)
   - No per-client project costs
   - Shared infrastructure

2. **Strong Data Isolation**
   - Schema-level separation (PostgreSQL native)
   - No risk of cross-client data leaks
   - Easy to archive/restore (drop/restore schema)
   - Clear data boundaries

3. **Simpler Queries**
   - No need for `WHERE tenant_id = ?` on every query
   - Schema context is implicit
   - Less chance of forgetting tenant filtering

4. **Better for Compliance**
   - Clear data separation for GDPR/regulations
   - Easy to export/delete client data (drop schema)
   - Audit-friendly (schema = client boundary)

### ❌ Disadvantages

1. **Complex Setup**
   - Must expose each schema in Supabase Dashboard
   - Must create RPC functions per schema (or use dynamic)
   - Must run migrations per schema
   - PostgREST limitations require workarounds

2. **Maintenance Overhead**
   - Schema setup checklist required
   - More steps per new client
   - Migration scripts need schema name replacement

3. **PostgREST Limitations**
   - Can't use `schema.table` format directly
   - Requires RPC functions or exposed schemas
   - More complex than single-schema approach

---

## Alternative: Single Schema with Tenant ID

### ✅ Advantages

1. **Simpler Setup**
   - One schema, one set of migrations
   - No schema exposure needed
   - Standard PostgREST queries work
   - Faster client onboarding

2. **Easier Maintenance**
   - Single migration path
   - No schema name replacement
   - Standard Supabase patterns

3. **Better Tooling**
   - Supabase Dashboard works out of the box
   - No PostgREST workarounds
   - Standard RLS patterns

### ❌ Disadvantages

1. **Data Isolation Risk**
   - Must remember `WHERE tenant_id = ?` on every query
   - Risk of cross-client data leaks if query is wrong
   - More complex RLS policies needed

2. **Compliance Concerns**
   - Data mixed in same tables
   - Harder to export/delete single client
   - More complex audit trails

3. **Query Complexity**
   - Every query needs tenant filtering
   - Easy to forget in joins/subqueries
   - More error-prone

---

## Recommendation

### Use Schema Segregation If:
- ✅ You need strong data isolation (compliance, security)
- ✅ You want simple queries (no tenant_id everywhere)
- ✅ You plan to archive/restore clients frequently
- ✅ You're comfortable with the setup complexity
- ✅ Cost is a primary concern (single project)

### Use Tenant ID If:
- ✅ You want simpler setup and maintenance
- ✅ You're okay with adding `tenant_id` to every query
- ✅ You have strong development practices (code review, testing)
- ✅ You want standard Supabase patterns
- ✅ Setup speed is more important than isolation

---

## Hybrid Approach (Best of Both Worlds?)

Consider a **hybrid approach**:

1. **Use schema segregation** for the core architecture
2. **Automate the setup** with a CLI script or setup wizard
3. **Create reusable migration templates** that accept schema name
4. **Build a superadmin panel** for one-click client setup

This gives you:
- ✅ Strong isolation (schema-level)
- ✅ Cost efficiency (single project)
- ✅ Simplified setup (automated)
- ✅ Best of both worlds

---

## Cost Comparison

### Schema Segregation (Current)
- **Supabase Projects**: 1
- **Monthly Cost**: Base plan cost (e.g., $25/month)
- **Scalability**: Unlimited clients in one project
- **Setup Time**: ~15-20 minutes per client (with automation: ~2 minutes)

### Separate Projects
- **Supabase Projects**: 1 per client
- **Monthly Cost**: Base plan × number of clients (e.g., $25 × 10 = $250/month)
- **Scalability**: Expensive at scale
- **Setup Time**: ~5 minutes per client (simpler, but more projects to manage)

### Tenant ID (Single Schema)
- **Supabase Projects**: 1
- **Monthly Cost**: Base plan cost (e.g., $25/month)
- **Scalability**: Unlimited clients in one project
- **Setup Time**: ~2 minutes per client (just add tenant_id to user)

---

## My Recommendation for Your Use Case

Given that you:
- Want affordability (single project)
- Need multiple clients
- Want data isolation
- Are building a CMS platform

**I recommend sticking with schema segregation BUT automating the setup.**

### Next Steps to Simplify:

1. **Create a setup script** that:
   - Accepts schema name as parameter
   - Runs all migrations automatically
   - Exposes schema in Supabase
   - Creates RPC functions
   - Sets up storage bucket

2. **Build a superadmin UI** for:
   - One-click client creation
   - Schema management
   - Client onboarding wizard

3. **Create migration templates** that:
   - Accept schema name as variable
   - No manual find/replace needed

This way you get:
- ✅ Strong isolation (schemas)
- ✅ Cost efficiency (one project)
- ✅ Simple setup (automated)
- ✅ Best of both worlds

---

## Decision Matrix

| Factor | Schema Segregation | Tenant ID | Separate Projects |
|--------|-------------------|-----------|-------------------|
| **Cost** | ✅ Low (1 project) | ✅ Low (1 project) | ❌ High (N projects) |
| **Isolation** | ✅✅ Strong | ⚠️ Moderate | ✅✅ Strong |
| **Setup Complexity** | ❌ High | ✅ Low | ✅ Low |
| **Query Simplicity** | ✅ Simple | ❌ Complex | ✅ Simple |
| **Compliance** | ✅✅ Excellent | ⚠️ Good | ✅✅ Excellent |
| **Maintenance** | ⚠️ Moderate | ✅ Easy | ❌ Hard (many projects) |
| **Scalability** | ✅✅ Excellent | ✅✅ Excellent | ❌ Poor (cost) |

---

## Conclusion

**Schema segregation is the right choice for your use case**, but we should **automate the complexity away**. The setup overhead is a one-time investment that pays off with:
- Strong data isolation
- Cost efficiency
- Simple queries
- Compliance readiness

The complexity we've encountered is mostly setup-related. Once automated, it becomes a non-issue.
