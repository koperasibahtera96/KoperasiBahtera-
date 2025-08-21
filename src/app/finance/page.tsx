import { PageLayout, PageHeader, Section, Grid, Card, Button, Flex } from "@/components";

export default function FinancePage() {
  return (
    <PageLayout>
      <PageHeader 
        title="Finance Dashboard"
        description="Financial reporting and investment tracking"
      >
        <Flex gap="sm">
          <Button variant="outline">Export Report</Button>
          <Button variant="primary">New Transaction</Button>
        </Flex>
      </PageHeader>

      <Section 
        title="Financial Overview"
        description="Key financial metrics and investment performance"
      >
        <Grid cols={4}>
          <Card className="status-success border">
            <h3 className="heading-tertiary mb-2">Total Investment</h3>
            <p className="text-2xl font-bold text-green-700">$1,245,000</p>
            <p className="text-sm text-green-600">+12.5% this month</p>
          </Card>
          
          <Card className="status-info border">
            <h3 className="heading-tertiary mb-2">Active Projects</h3>
            <p className="text-2xl font-bold text-blue-700">24</p>
            <p className="text-sm text-blue-600">3 new this week</p>
          </Card>
          
          <Card className="status-warning border">
            <h3 className="heading-tertiary mb-2">Pending Reviews</h3>
            <p className="text-2xl font-bold text-yellow-700">8</p>
            <p className="text-sm text-yellow-600">Requires attention</p>
          </Card>
          
          <Card className="status-success border">
            <h3 className="heading-tertiary mb-2">ROI</h3>
            <p className="text-2xl font-bold text-green-700">18.2%</p>
            <p className="text-sm text-green-600">Above target</p>
          </Card>
        </Grid>
      </Section>

      <Section title="Quick Actions">
        <Grid cols={3}>
          <Card>
            <h3 className="heading-tertiary mb-3">Investment Reports</h3>
            <p className="text-muted mb-4">Generate detailed investment performance reports</p>
            <Button variant="outline" size="sm">Generate Report</Button>
          </Card>
          
          <Card>
            <h3 className="heading-tertiary mb-3">Transaction History</h3>
            <p className="text-muted mb-4">View and manage financial transactions</p>
            <Button variant="outline" size="sm">View History</Button>
          </Card>
          
          <Card>
            <h3 className="heading-tertiary mb-3">Budget Planning</h3>
            <p className="text-muted mb-4">Plan and track budget allocations</p>
            <Button variant="outline" size="sm">Manage Budget</Button>
          </Card>
        </Grid>
      </Section>
    </PageLayout>
  );
}