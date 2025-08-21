import { PageLayout, PageHeader, Section, Grid, Card, Button } from "@/components";

export default function AdminPage() {
  return (
    <PageLayout>
      <PageHeader 
        title="Admin Dashboard"
        description="System administration and user management"
      >
        <Button variant="danger">System Settings</Button>
      </PageHeader>

      <Section 
        title="Administrative Tools"
        description="Manage users, roles, and system configuration"
      >
        <Grid cols={2}>
          <Card>
            <h3 className="heading-tertiary mb-3">User Management</h3>
            <p className="text-muted mb-4">Create, edit, and manage user accounts</p>
            <Button variant="primary" size="sm">Manage Users</Button>
          </Card>
          
          <Card>
            <h3 className="heading-tertiary mb-3">Role & Permissions</h3>
            <p className="text-muted mb-4">Configure user roles and access permissions</p>
            <Button variant="primary" size="sm">Manage Roles</Button>
          </Card>
          
          <Card>
            <h3 className="heading-tertiary mb-3">System Logs</h3>
            <p className="text-muted mb-4">View system activity and audit trails</p>
            <Button variant="outline" size="sm">View Logs</Button>
          </Card>
          
          <Card>
            <h3 className="heading-tertiary mb-3">Database Backup</h3>
            <p className="text-muted mb-4">Manage database backups and restoration</p>
            <Button variant="outline" size="sm">Backup Now</Button>
          </Card>
        </Grid>
      </Section>
    </PageLayout>
  );
}