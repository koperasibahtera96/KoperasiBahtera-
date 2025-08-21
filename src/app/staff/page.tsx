import { PageLayout, PageHeader, Section, Grid, Card, Button } from "@/components";

export default function StaffPage() {
  return (
    <PageLayout>
      <PageHeader 
        title="Staff Dashboard"
        description="Manage staff activities and resources"
      >
        <Button variant="primary">Add New Staff</Button>
      </PageHeader>

      <Section 
        title="Quick Actions"
        description="Common staff management tasks"
      >
        <Grid cols={3}>
          <Card>
            <h3 className="heading-tertiary mb-3">Staff Directory</h3>
            <p className="text-muted mb-4">View and manage staff information</p>
            <Button variant="outline" size="sm">View Directory</Button>
          </Card>
          
          <Card>
            <h3 className="heading-tertiary mb-3">Attendance</h3>
            <p className="text-muted mb-4">Track staff attendance and schedules</p>
            <Button variant="outline" size="sm">View Attendance</Button>
          </Card>
          
          <Card>
            <h3 className="heading-tertiary mb-3">Reports</h3>
            <p className="text-muted mb-4">Generate staff performance reports</p>
            <Button variant="outline" size="sm">Generate Report</Button>
          </Card>
        </Grid>
      </Section>
    </PageLayout>
  );
}