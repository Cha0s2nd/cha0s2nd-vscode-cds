using System;
using System.Collections.Generic;

namespace sdk_wrapper.Models
{
  public class Arguments
  {
    public string Action { get; set; }
    public string Solution { get; set; }
    public string ConnectionString { get; set; }
    public string Username { get; set; }
    public string Password { get; set; }
    public Uri Url { get; set; }
    public IEnumerable<string> AdditionalArgs { get; set; }
  }
}