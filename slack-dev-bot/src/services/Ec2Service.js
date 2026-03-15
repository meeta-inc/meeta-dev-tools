const {
  EC2Client,
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
} = require('@aws-sdk/client-ec2');

class Ec2Service {
  /**
   * @param {object} options
   * @param {string} options.region - AWS 리전
   * @param {string} options.nameFilter - Name 태그 필터 (예: "devcontainer")
   */
  constructor({ region, nameFilter }) {
    this.client = new EC2Client({ region });
    this.nameFilter = nameFilter || '*';
  }

  /**
   * Name 태그 필터로 인스턴스를 동적 검색하여 상태와 함께 반환한다.
   * terminated 인스턴스는 제외한다.
   */
  async describeAll() {
    const command = new DescribeInstancesCommand({
      Filters: [
        { Name: 'tag:Name', Values: [`*${this.nameFilter}*`] },
        { Name: 'instance-state-name', Values: ['running', 'stopped', 'pending', 'stopping'] },
      ],
    });
    const response = await this.client.send(command);

    const instances = [];
    for (const reservation of response.Reservations || []) {
      for (const inst of reservation.Instances || []) {
        const name = (inst.Tags || []).find((t) => t.Key === 'Name')?.Value || inst.InstanceId;
        instances.push({
          instanceId: inst.InstanceId,
          name,
          description: name,
          emoji: ':computer:',
          state: inst.State?.Name || 'unknown',
        });
      }
    }

    // 이름 순 정렬
    instances.sort((a, b) => a.name.localeCompare(b.name));
    return instances;
  }

  async start(instanceId) {
    const command = new StartInstancesCommand({ InstanceIds: [instanceId] });
    return this.client.send(command);
  }

  async stop(instanceId) {
    const command = new StopInstancesCommand({ InstanceIds: [instanceId] });
    return this.client.send(command);
  }

  /**
   * instanceId로 메타 정보를 동적 조회한다.
   */
  async findById(instanceId) {
    const command = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
    const response = await this.client.send(command);
    const inst = response.Reservations?.[0]?.Instances?.[0];
    if (!inst) return undefined;

    const name = (inst.Tags || []).find((t) => t.Key === 'Name')?.Value || instanceId;
    return {
      instanceId: inst.InstanceId,
      name,
      description: name,
      emoji: ':computer:',
    };
  }
}

module.exports = Ec2Service;
