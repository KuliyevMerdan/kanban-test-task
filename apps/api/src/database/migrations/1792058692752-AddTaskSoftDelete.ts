import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskSoftDelete1792058692752 implements MigrationInterface {
    name = 'AddTaskSoftDelete1792058692752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "deleted_at"`);
    }

}
