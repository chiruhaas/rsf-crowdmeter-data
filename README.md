# RSF Crowd Meter (For Weight Room)

> **Work in progress** — the backend is fully implemented and hosted on AWS. The frontend is planned but not yet built.

:weight_lifting:  A tool for UC Berkeley students to find the optimal time to visit the RSF (Recreational Sports Facility) weight room, based on historical crowd data. 

Ever walk into the weight room in RSF, just to see 0 available machines? Or maybe people with absolutely no spatial awareness brushing by you mid set? This tool will help you decide when the weight room is least packed and you can finish your workout in peace.

## How it works

A scraper runs every minute during RSF operating hours on an EC2 instance, polling the [Density](https://www.density.io/) occupancy API and writing crowd data to a PostgreSQL (RDS) database. Somehow, this API has info on how many people are in each of the 3 weight rooms (main room, extension room, and annex). 

## Repo structure

```
backend/   # TypeScript scraper that polls Density and writes to Postgres
cdk/       # AWS CDK stack (EC2 + RDS + VPC)
```

## Backend

- **Runtime:** Node.js 20, TypeScript
- **Database:** PostgreSQL 16 (AWS RDS)
- **Scheduler:** cron (runs every minute, `isRSFOpen()` filters by PST operating hours)
- **Secrets:** DB credentials stored in AWS Secrets Manager, fetched at boot

### RSF operating hours (PST)

| Day            | Hours       |
|----------------|-------------|
| Monday–Friday  | 7am – 11pm  |
| Saturday       | 8am – 6pm   |
| Sunday         | 8am – 11pm  |

## Infrastructure (AWS CDK)

- **VPC** with public subnet (EC2) and isolated subnet (RDS)
- **EC2** t3.micro running Ubuntu 24.04, IAM role scoped to read the DB secret
- **RDS** PostgreSQL t3.micro in isolated subnet, not publicly accessible
- **Security groups** — RDS only accepts connections from the EC2 instance on port 5432

### Deploy

```bash
cd cdk
cdk deploy --context keyName=<ec2-key-pair-name> --context densityToken=<density-api-token>
```

## Planned

- REST API to expose historical timeseries data by date
- React/Next.js frontend with crowd percentage charts to help pick an optimal gym session time (30–90 min)\
